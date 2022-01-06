import User from '../orm/entity/user';
import Application from '../orm/entity/application';
import ApplicationUser from '../orm/entity/application_user';
import ApplicationUserMetadata from '../orm/entity/application_user_metadata';

import { ServerController, ServerResponse, ServerResponseError } from '../server/server_controller';
import { Server, ServerRequest, ServerSession } from '../server/server';
import { ILike, Repository } from 'typeorm';
import * as moment from 'moment';
import * as express from 'express';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

export class ApplicationController extends ServerController {
    public constructor() {
        super('/application');

        // to use the application routes we must be logged in
        this.router.use(async (req, res, next) => {
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
        });

        // read routes GET METHOD
        this.router.get('/list', this.getList);

        // creation routes POST METHOD
        this.router.post('/register', this.postRegister);
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
            success: errors.length > 0,
            response: bodyResponse,
            errors: errors,
        };
        response.json(serverResponse);
    }
}

export default ApplicationController;
