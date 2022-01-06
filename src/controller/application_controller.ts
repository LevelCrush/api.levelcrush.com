import User from '../orm/entity/user';
import Application from '../orm/entity/application';
import ApplicationUser from '../orm/entity/application_user';
import ApplicationUserMetadata from '../orm/entity/application_user_metadata';

import { ServerController, ServerResponse, ServerResponseError } from '../server/server_controller';
import { Server, ServerRequest, ServerSession } from '../server/server';
import { Repository } from 'typeorm';
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
    public async postRegister(request: express.Request, response: express.Response) {}
}

export default ApplicationController;
