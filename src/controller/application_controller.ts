import User from '../orm/entity/user';
import Application from '../orm/entity/application';
import ApplicationUser from '../orm/entity/application_user';
import ApplicationUserMetadata from '../orm/entity/application_user_metadata';

import { UserSession } from './user_controller';
import { ServerController, ServerResponse, ServerResponseError } from '../server/server_controller';
import { Repository } from 'typeorm';
import { Server, ServerRequest } from '../server/server';
import * as moment from 'moment';
import * as express from 'express';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

export class ApplicationController extends ServerController {
    public constructor() {
        super('/application');

        // create routes

        // read routes GET METHOD
        this.router.get('/list', this.getList);

        // creation routes POST METHOD
        this.router.post('/register', this.postRegister);
        this.router.post('/update', this.postUpdate);
    }

    public async getList(request: express.Request, response: express.Response) {
        // make sure we are ready to process this as our own api server request that has some additions to it
        let serverRequest = request as ServerRequest;
    }

    public async postRegister(request: express.Request, response: express.Response) {}

    public async postUpdate(request: express.Request, response: express.Response) {}
}

export default ApplicationController;
