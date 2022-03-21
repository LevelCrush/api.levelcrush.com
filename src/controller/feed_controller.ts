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
        super('/feed');

        this.router.post('/', this.postCreate);
        this.router.post('/get', this.postGet);
    }

    public async postGet(request: express.Request, response: express.Response) {
        // make sure we are ready to process this as our own api server request that has some additions to it
        let serverRequest = request as ServerRequest;

        // grab database connection
        let database = serverRequest.globals.database.raw();

        // cast the body into what we are HOPEFULLY expectig
        let form = request.body as {
            application?: string;
            name?: string;
        };

        // body response
        let bodyResponse: { [key: string]: unknown } = {};

        // validate
        let errors: ServerResponseError[] = [];

        let application: Application | undefined = undefined;
        let formApplication = form.application ? form.application.trim() : '';
        let formName = form.name ? form.name.trim() : '';
        if (!errors.length) {
            if (formApplication.length === 0) {
                errors.push({
                    field: 'application',
                    message: 'Please specify an application',
                });
            }
        }

        if (!errors.length) {
            if (formName.length === 0) {
                errors.push({
                    field: 'name',
                    message: 'Please specify a name for this feed',
                });
            }
        }

        if (!errors.length) {
            application = await database.getRepository(Application).findOne({
                where: {
                    token: formApplication,
                    deleted_at: 0,
                },
            });
            if (application === undefined) {
                errors.push({
                    field: 'application',
                    message: 'Please specify a valid application',
                });
            }
        }

        if (!errors.length && application) {
            let feed = await database.getRepository(Feed).findOne({
                where: {
                    application: application.id,
                    name: formName,
                    deleted_at: 0,
                },
            });

            if (feed) {
                bodyResponse['feed'] = {
                    name: feed.name,
                    data: feed.data,
                    created_at: feed.created_at,
                    updated_at: feed.updated_at,
                };
            }
        }

        // output our errros
        response.json({
            success: errors.length === 0 ? true : false,
            response: bodyResponse,
            errors: errors,
        });
    }

    public async postCreate(request: express.Request, response: express.Response) {
        // make sure we are ready to process this as our own api server request that has some additions to it
        let serverRequest = request as ServerRequest;

        // grab database connection
        let database = serverRequest.globals.database.raw();

        // cast the body into what we are HOPEFULLY expectig
        let form = request.body as {
            application?: string;
            application_secret?: string;
            name?: string;
            data?: string;
        };

        // body response
        let bodyResponse: { [key: string]: unknown } = {};

        // validate
        let errors: ServerResponseError[] = [];

        let formApplication = form.application ? form.application.trim() : '';
        let formApplicationSecret = form.application_secret ? form.application_secret.trim() : '';
        let formName = form.name ? form.name.trim() : '';
        let formData = form.data ? form.data.trim() : '';

        let application: Application | undefined = undefined;

        if (!errors.length) {
            if (formApplication.length === 0) {
                errors.push({
                    field: 'application',
                    message: 'Please specify an application',
                });
            }
        }

        if (!errors.length) {
            if (formApplicationSecret.length === 0) {
                errors.push({
                    field: 'application_secret',
                    message: 'Please specify an application secret',
                });
            }
        }

        if (!errors.length) {
            if (formName.length === 0) {
                errors.push({
                    field: 'name',
                    message: 'Please specify a name for this feed',
                });
            }
        }

        if (!errors.length) {
            application = await database.getRepository(Application).findOne({
                where: {
                    token: formApplication,
                    token_secret: formApplicationSecret,
                    deleted_at: 0,
                },
            });
            if (application === undefined) {
                errors.push({
                    field: 'application',
                    message: 'Please specify a valid application',
                });
            }
        }

        // no errors found, time to insert /update the feed
        if (!errors.length && application !== undefined) {
            let feed = await database.getRepository(Feed).findOne({
                where: {
                    application: application.id,
                    name: formName,
                    deleted_at: 0,
                },
            });

            if (feed === undefined) {
                let newFeed: Partial<Feed> = {
                    name: formName,
                    application: application.id,
                    data: formData,
                    created_at: moment().unix(),
                    updated_at: 0,
                    deleted_at: 0,
                };

                // save the feed
                await database.getRepository(Feed).save(newFeed);

                // get the latest row
                feed = await database.getRepository(Feed).findOne({
                    where: {
                        application: application.id,
                        name: formName,
                        deleted_at: 0,
                    },
                });
            } else {
                feed.data = formData;
                feed.updated_at = moment().unix();
                await database.getRepository(Feed).save(feed);
            }

            if (feed !== undefined) {
                bodyResponse['feed'] = {
                    name: feed.name,
                    data: feed.data,
                };
            }
        }

        // output our errros
        response.json({
            success: errors.length === 0 ? true : false,
            response: bodyResponse,
            errors: errors,
        });
    }
}

export default FeedController;
