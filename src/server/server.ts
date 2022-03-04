import * as express from 'express';
import * as ExpressSession from 'express-session';
import * as cors from 'cors';
import * as bodyParser from 'body-parser';
import * as multer from 'multer';
import Database from '../orm/database';

import { Session } from '../orm/entity/session';
import { Repository } from 'typeorm';
import { TypeormStore } from 'connect-typeorm';
import User from '../orm/entity/user';
import session = require('express-session');
import ENV from '../env';
import * as https from 'https';
import * as fs from 'fs';

export interface ServerSessionSettings {
    ttl: number;
    secret: string;
}

export interface ServerCorsSettings {
    origins: string[];
}

export interface ServerRequest extends express.Request {
    globals: {
        database: Database;
        user?: User;
    };
}

export interface ServerSession extends session.Session {
    user?: string;
    applications?: { [appName: string]: { [key: string]: unknown } };
}

export class Server {
    public app: express.Express;
    public database: Database;
    private sessionRepository: Repository<Session>;
    private sessionSettings: ServerSessionSettings;
    private corSettings: ServerCorsSettings;
    private port: number = 8080;
    private httpsServer: https.Server | undefined;

    private readonly defaultCorsSettings: ServerCorsSettings = {
        origins: ['*'],
    };
    private readonly defaultSessionSettings: ServerSessionSettings = {
        ttl: 86400,
        secret: 'goodsoup',
    };

    public constructor(database: Database) {
        this.database = database;
        this.sessionRepository = this.database.raw().getRepository(Session);

        this.port = ENV.server && ENV.server.port !== undefined ? ENV.server.port : 8080;

        // if we have no session settings defined use our defaults, if we have defined session settings, merge them with the defaults via object spread
        this.sessionSettings =
            ENV.server && ENV.server.session === undefined
                ? this.defaultSessionSettings
                : { ...this.defaultSessionSettings, ...(ENV.server && ENV.server.session ? ENV.server.session : {}) };

        // repeat the same step of above but this time for cor settings
        this.corSettings = { ...this.defaultCorsSettings, ...{} };

        // create our express app
        this.app = express();
        let enableSSL = ENV.server && ENV.server.ssl !== undefined ? true : false;
        if (ENV.server && ENV.server.ssl !== undefined) {
            this.httpsServer = https.createServer(
                {
                    key: fs.readFileSync(ENV.server.ssl.key),
                    cert: fs.readFileSync(ENV.server.ssl.cert),
                },
                this.app,
            );
        }

        // store important things in the middleware for use later
        this.app.use((req, res, next) => {
            (req as ServerRequest).globals = {
                database: database,
                user: undefined,
            };

            next();
        });

        // configure our express session
        this.app.use(
            ExpressSession({
                resave: false,
                saveUninitialized: false,
                store: new TypeormStore({
                    cleanupLimit: 2,
                    limitSubquery: false,
                    ttl: this.sessionSettings.ttl,
                }).connect(this.sessionRepository),
                secret: this.sessionSettings.secret,
            }),
        );

        // configure our cors settings
        this.app.use(
            cors({
                optionsSuccessStatus: 200,
                credentials: true,
                preflightContinue: true,
                origin: (origin, callback) => {
                    origin = origin !== undefined ? origin : '';
                    let allowAll = this.corSettings.origins[0] === '*';
                    let originAllowed = allowAll || this.corSettings.origins.indexOf(origin) !== -1;
                    callback(
                        originAllowed ? null : new Error('Domain did not pass CORS'),
                        originAllowed ? true : undefined,
                    );
                },
            }),
        );

        this.app.use(async (req, res, next) => {
            let session = req.session as ServerSession;
            if (session.user !== undefined) {
                // make sure we are ready to process this as our own api server request that has some additions to it
                let serverRequest = req as ServerRequest;
                serverRequest.globals.user = await serverRequest.globals.database
                    .raw()
                    .getRepository(User)
                    .findOne({
                        where: {
                            token: session.user.toString(),
                            deleted_at: 0,
                            banned_at: 0,
                        },
                    });

                if (serverRequest.globals.user === undefined) {
                    // this means we actually have an invalid user and should immediately regenerate the session
                    req.session.regenerate(() => {
                        next();
                    });
                } else {
                    // user valid! move on
                    next();
                }
            } else {
                // no user in session, no need to validate. move on
                next();
            }
        });

        // configure body parsing
        this.app.use(bodyParser.json());
        this.app.use(bodyParser.urlencoded({ extended: true }));

        this.app.get('/', (req, res) => {
            res.json({
                success: true,
                response: {
                    message: 'Please use the proper routes',
                },
                errors: [],
            });
        });

        this.app.get('/ping', (req, res) => {
            res.sendStatus(200);
        });

        // setup dummy routes for the favicon and robot(s) txt files
        this.app.use('/favicon.ico', (req, res) => {
            res.sendStatus(200);
        });

        this.app.use('/robot.txt', (req, res) => {
            res.type('text/plain');
            res.send('User-agent: *\nDisallow: /');
        });

        this.app.use('/robots.txt', (req, res) => {
            res.type('text/plain');
            res.send('User-agent: *\nDisallow: /');
        });
    }

    public router(route: string, router: express.Router) {
        console.log('Using Route: ' + route);
        this.app.use(route, router);
    }

    public start() {
        // on start add this wildcard route to catch anything else
        this.app.use((req, res) => {
            res.sendStatus(404);
        });
        return new Promise(() => {
            if (this.httpsServer !== undefined) {
                this.httpsServer.listen(this.port, () => {
                    console.log('Doing something on ' + this.port);
                });
            } else {
                this.app.listen(this.port, () => {
                    console.log('Now listening on ' + this.port);
                });
            }
        });
    }
}

export default Server;
