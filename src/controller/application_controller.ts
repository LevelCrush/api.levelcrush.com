import User from '../orm/entity/user';
import Application from '../orm/entity/application';
import ApplicationUser from '../orm/entity/application_user';
import ApplicationUserMetadata from '../orm/entity/application_user_metadata';

import { ServerController, ServerResponse, ServerResponseError } from '../server/server_controller';
import { ServerRequest, ServerSession } from '../server/server';
import { ILike, Repository } from 'typeorm';
import * as moment from 'moment';
import * as express from 'express';
import * as crypto from 'crypto';

export class ApplicationController extends ServerController {
    public constructor() {
        super('/application');

        // to use the application routes we must be logged in
        this.router.use(async (req, res, next) => {
            if (req.method.toLowerCase() !== 'options') {
                let serverResponse: ServerResponse = {
                    success: true,
                    response: {},
                    errors: [],
                };

                let serverRequest = req as ServerRequest;
                if (serverRequest.globals.user === undefined) {
                    // we are not valid, send a json response back indicating failure
                    serverResponse.success = false;
                    serverResponse.response = {
                        message: 'Please login',
                        user: null,
                        valid: false,
                    };
                    res.json(serverResponse);
                } else {
                    next();
                }
            } else {
                res.sendStatus(200);
            }
        });

        // read routes GET METHOD
        this.router.get('/list', this.getList);

        // creation routes POST METHOD
        this.router.post('/register', this.postRegister);
        this.router.post('/login', this.postLogin);
        this.router.post('/verify', this.postVerify);

        // fetch metadata
    }

    public async postVerify(request: express.Request, response: express.Response) {
        // make sure we are ready to process this as our own api server request that has some additions to it
        let serverRequest = request as ServerRequest;

        let database = serverRequest.globals.database.raw();
        let applicationRepostory = database.getRepository(Application);

        // cast the body into what we are HOPEFULLY expectig
        let form = request.body as {
            token?: string;
            token_secret?: string;
        };

        let appToken = form.token !== undefined ? form.token.trim() : '';
        let appTokenSecret = form.token_secret !== undefined ? form.token_secret.trim() : '';

        const application = await applicationRepostory.findOne({
            where: {
                token: appToken,
                token_secret: appTokenSecret,
                deleted_at: 0,
            },
        });

        let serverResponse: ServerResponse = {
            success: true,
            response: {
                verified: application !== undefined ? true : false,
                timestamp: moment().unix(),
            },
            errors: [],
        };

        response.json(serverResponse);
    }

    /**
     * Get a list of all applications tied to the authenticated user
     * @param request
     * @param response
     */
    public async getList(request: express.Request, response: express.Response) {
        // make sure we are ready to process this as our own api server request that has some additions to it
        let serverRequest = request as ServerRequest;

        let database = serverRequest.globals.database.raw();
        let applicationRepostory = database.getRepository(Application);

        // in our case we know through middleware that our user is going to be present in the session to even
        // access this route
        let authenticatedUser = serverRequest.globals.user as User;

        let userApplications = await applicationRepostory.find({
            where: {
                user: authenticatedUser.id,
                deleted_at: 0,
            },
        });

        let serverResponse: ServerResponse = {
            success: true,
            response: {
                applications: userApplications,
                timestamp: moment().unix(),
            },
            errors: [],
        };

        response.json(serverResponse);
    }

    /**
     * Register a user to an application in our database
     * @param request
     * @param response
     */
    public async postRegister(request: express.Request, response: express.Response) {
        // make sure we are ready to process this as our own api server request that has some additions to it
        let serverRequest = request as ServerRequest;

        // grab database connection
        let database = serverRequest.globals.database.raw();

        // we know to even hit this route we need our user to be defined and logged in
        // safe to cast to normal user and safe to assume we have something to work with
        let authenticatedUser = serverRequest.globals.user as User;

        // cast the body into what we are HOPEFULLY expectig
        let form = request.body as {
            url?: string;
            name?: string;
            description?: string;
        };

        let bodyResponse: { [key: string]: unknown } = {};

        // validate
        let errors: ServerResponseError[] = [];

        // validate app url
        let appUrl = form.url !== undefined ? form.url.trim().toLowerCase() : '';
        if (!errors.length) {
            if (appUrl.length === 0) {
                errors.push({
                    field: 'host',
                    message: 'Please supply a hostname/url for the application',
                });
            } else if (appUrl.length > 255) {
                errors.push({
                    field: 'host',
                    message: 'Please restrict hostname/url to less then 255 characters',
                });
            }
        }

        // validate app name
        let appName = form.name !== undefined ? form.name.trim() : '';
        if (!errors.length) {
            if (appName.length === 0) {
                errors.push({
                    field: 'name',
                    message: 'Please include a name for the application',
                });
            } else if (appName.length > 255) {
                errors.push({
                    field: 'name',
                    message: 'Please restrict the name of the application to fewer then 255 characters',
                });
            }
        }
        // no need to validate app descriptionf or now
        let appDescription = form.description !== undefined ? form.description.trim() : '';

        // no duplicate check
        if (!errors.length) {
            // now we check to make sure that we dont have duplicate apps on this user for the same account
            let applicationRepository = database.getRepository(Application);
            let matchingApplications = await applicationRepository.find({
                where: {
                    user: authenticatedUser.id,
                    name: ILike(appName),
                },
            });
            if (matchingApplications.length > 0) {
                errors.push({
                    field: 'name',
                    message: 'A application with this name already exist on your account',
                });
            }
        }

        // create user if we have got this far
        if (!errors.length) {
            let application: Partial<Application> = {
                host: appUrl,
                name: appName,
                description: appDescription,
                user: authenticatedUser.id,
                token: crypto
                    .createHash('md5')
                    .update(appName + appDescription + appUrl + authenticatedUser.token + moment().unix())
                    .digest('hex'),
                token_secret: crypto
                    .createHash('md5')
                    .update(appUrl + appDescription + authenticatedUser.token_secret + appName + moment().unix())
                    .digest('hex'),
                created_at: moment().unix(),
                deleted_at: 0,
                updated_at: 0,
            };

            let applicationRepository = database.getRepository(Application);
            await applicationRepository.save(application);

            bodyResponse['application'] = {
                user: authenticatedUser.token,
                host: application.host,
                name: application.name,
                description: application.description,
                token: application.token,
            };
        }
        let serverResponse: ServerResponse = {
            success: errors.length === 0,
            response: bodyResponse,
            errors: errors,
        };
        response.json(serverResponse);
    }

    public async postLogin(request: express.Request, response: express.Response) {
        // make sure we are ready to process this as our own api server request that has some additions to it
        let serverRequest = request as ServerRequest;

        // grab database connection
        let database = serverRequest.globals.database.raw();

        // we know to even hit this route we need our user to be defined and logged in
        // safe to cast to normal user and safe to assume we have something to work with
        let authenticatedUser = serverRequest.globals.user as User;

        // cast the body into what we are HOPEFULLY expectig
        let form = request.body as {
            application?: string;
        };

        let bodyResponse: { [key: string]: unknown } = {};

        // validate
        let errors: ServerResponseError[] = [];

        // make sure we have a a valid application
        let application: Application | undefined = undefined;
        let loginApp = form.application !== undefined ? form.application.trim() : '';
        if (!errors.length) {
            let applicationRepository = database.getRepository(Application);
            application = await applicationRepository.findOne({
                where: {
                    token: loginApp,
                    deleted_at: 0,
                },
            });

            if (application === undefined) {
                errors.push({
                    field: 'application',
                    message: 'Please provide a valid application token',
                });
            }
        }

        let applicationUser: ApplicationUser | undefined = undefined;
        let firstLoad = false;
        if (!errors.length) {
            // query application_users to se if we have ever loaded into this application before
            let applicationUserRepository = database.getRepository(ApplicationUser);
            applicationUser = await applicationUserRepository.findOne({
                where: {
                    application: (application as Application).id,
                    user: (authenticatedUser as User).id,
                    deleted_at: 0,
                },
            });

            if (applicationUser === undefined) {
                // first time using the application. create them in the database

                let userID = (authenticatedUser as User).id;
                let appID = (application as Application).id;

                let newAppUser: Partial<ApplicationUser> = {
                    application: appID,
                    user: userID,
                    token: crypto
                        .createHash('md5')
                        .update(moment().unix() + userID + appID + loginApp)
                        .digest('hex'),
                    created_at: moment().unix(),
                    updated_at: 0,
                    deleted_at: 0,
                };

                // save the new application_user record
                await applicationUserRepository.save(newAppUser);

                // fetch the application user that we just inserted
                // we may be able to reuse what is returned from the repository.save(...)
                // but this will gaurentee we get it fresh (unless typeorm has a hidden caching feature)
                applicationUser = await applicationUserRepository.findOne({
                    where: {
                        application: (application as Application).id,
                        user: (authenticatedUser as User).id,
                        deleted_at: 0,
                    },
                });

                if (applicationUser === undefined) {
                    errors.push({
                        field: 'application',
                        message: 'There was a problem logging the user in.',
                    });
                } else {
                    firstLoad = true;
                }
            }
        }

        if (!errors.length) {
            bodyResponse = {
                valid: true,
                firstLoad: firstLoad,
                token: (applicationUser as ApplicationUser).token,
                application: (application as Application).token,
                user: (authenticatedUser as User).token,
                timestamp: moment().unix(),
            };
        }

        let serverResponse: ServerResponse = {
            success: errors.length === 0,
            response: bodyResponse,
            errors: errors,
        };

        if (!errors.length) {
            let serverSession = request.session as ServerSession;
            if (serverSession.applications === undefined) {
                serverSession.applications = {};
            }
            serverSession.applications[(application as Application).token] = {};
            serverSession.save(() => {
                response.json(serverResponse);
            });
        } else {
            response.json(serverResponse);
        }
    }
}

export default ApplicationController;
