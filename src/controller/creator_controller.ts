import * as moment from 'moment';
import * as express from 'express';
import User from '../orm/entity/user';
import Creator from '../orm/entity/creator';
import Application from '../orm/entity/application';
import ApplicationUser from '../orm/entity/application_user';
import { ServerController, ServerResponse, ServerResponseError } from '../server/server_controller';

export class CreatorController extends ServerController {
    public constructor() {
        super('/creator');

        this.router.post('/creator', this.postCreator);
        this.router.post('/creator/add', this.postCreatorAdd);
        this.router.post('/creator/delete', this.postCreatorDelete);
    }

    /**
     * Fetches all creator records tied to a user record
     * @param request
     * @param response
     */
    public async postCreator(request: express.Request, response: express.Response) {
        //   todo
    }

    public async postCreatorAdd(request: express.Request, response: express.Response) {
        // todo
    }

    public async postCreatorDelete(request: express.Request, response: express.Response) {
        // todo
    }
}

export default CreatorController;
