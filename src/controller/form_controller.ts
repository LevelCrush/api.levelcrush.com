import * as moment from 'moment';
import * as express from 'express';
import User from '../orm/entity/user';
import Creator from '../orm/entity/creator';
import Application from '../orm/entity/application';
import ApplicationUser from '../orm/entity/application_user';
import { ServerController, ServerResponse, ServerResponseError } from '../server/server_controller';
import { ServerRequest } from '../server/server';
import Feed from '../orm/entity/feed';

/** these routes can only be accessed by a logged in user */
export class FeedController extends ServerController {
    public constructor() {
        super('/forms');

        this.router.post('/write', this.postWrite);
    }

    public async postWrite(request: express.Request, response: express.Response) {
        // make sure we are ready to process this as our own api server request that has some additions to it
        let serverRequest = request as ServerRequest;

        // grab database connection
        let database = serverRequest.globals.database.raw();

        // cast the body into what we are HOPEFULLY expectig
        let form = request.body as {
            application?: string;
            application_secret?: string;
            form_id?: string;
            form_data?: string;
        };

        // body response
        let bodyResponse: { [key: string]: unknown } = {};

        // validate
        let errors: ServerResponseError[] = [];

        // output our errros
        response.json({
            success: errors.length === 0 ? true : false,
            response: bodyResponse,
            errors: errors,
        });
    }
}

export default FeedController;
