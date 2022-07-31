import * as moment from 'moment';
import * as express from 'express';
import User from '../orm/entity/user';
import Creator from '../orm/entity/creator';
import Application from '../orm/entity/application';
import ApplicationUser from '../orm/entity/application_user';
import { ServerController, ServerResponse, ServerResponseError } from '../server/server_controller';
import { isRegExp } from 'util';
import { ServerRequest } from '../server/server';

/** these routes can only be accessed by a logged in user */
export class CreatorController extends ServerController {
    public constructor() {
        super('/creator');

        // we must have a user logged in to authenticate
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
        this.router.post('/', this.postCreator);
        this.router.post('/add', this.postCreatorAdd);
        // this.router.post('/creator/delete', this.postCreatorDelete);
    }

    /**
     * Fetches all creator records tied to a user record
     * @param request
     * @param response
     */
    public async postCreator(request: express.Request, response: express.Response) {
        //   todo

        let serverRequest = request as ServerRequest;

        let errors: ServerResponseError[] = [];
        let bodyResponse: { [key: string]: unknown } = {};

        // because of our authentication this is easy to retrieve
        let user: User = serverRequest.globals.user as User;

        // get all creator entites from db
        let database = serverRequest.globals.database.raw();
        let creators = await database.getRepository(Creator).find({
            where: {
                deleted_at: 0,
                user: user.id,
            },
        });

        bodyResponse['results'] = creators;

        // output our errros
        response.json({
            success: errors.length === 0 ? true : false,
            errros: errors,
        });
    }

    public async postCreatorAdd(request: express.Request, response: express.Response) {
        // todo
        let serverRequest = request as ServerRequest;

        // how we expect our request body to be, but cannot gaurentee
        let form = request.body as {
            type?: 'twitch' | 'youtube';
            url?: string;
            embed?: string;
            additional?: string;
        };

        let errors: ServerResponseError[] = [];
        let bodyResponse: { [key: string]: unknown } = {};

        // due to protections above in our route we know this will only execute if we have a logged in user
        let user: User = serverRequest.globals.user as User;
        let creator: Creator | undefined = undefined;

        let formType = form.type !== undefined ? form.type.trim().toLowerCase() : 'twitch';
        let formUrl = form.url !== undefined ? form.url.trim() : '';
        let formEmbed = form.embed !== undefined ? form.embed.trim() : '';
        let formAdditional = form.additional !== undefined ? form.additional.trim() : '';

        let database = serverRequest.globals.database.raw();
        if (!errors.length) {
            if (formType !== 'twitch') {
                // we are only supporting twitch connections at the moment
                errors.push({
                    field: 'type',
                    message: 'We are only supporting twitch creator connections right now',
                });
            }
        }

        if (!errors.length) {
            if (formUrl.length === 0) {
                errors.push({
                    field: 'url',
                    message: 'Please specify a url to link to your creator connection',
                });
            }
        }

        if (!errors.length) {
            creator = await database.getRepository(Creator).findOne({
                where: {
                    deleted_at: 0,
                    user: user.id,
                    platform: formType,
                    url: formUrl,
                },
            });

            if (creator !== undefined) {
                errors.push({
                    field: 'url',
                    message: 'There is already a matching connection on your account to this url',
                });
            }
        }

        if (!errors.length) {
            // attempt to insert
            let newCreator: Partial<Creator> = {
                user: user.id,
                platform: formType,
                embed: formEmbed,
                url: formUrl,
                avatar: '',
                additional: formAdditional,
                created_at: moment().unix(),
                deleted_at: 0,
                updated_at: 0,
            };

            await database.getRepository(Creator).save(newCreator);
            // remove user and id (these are raw id fields)
            delete newCreator['id'];
            delete newCreator['user'];

            bodyResponse['creator'] = newCreator;
        }

        // output our errros
        response.json({
            success: errors.length === 0 ? true : false,
            response: bodyResponse,
            errros: errors,
        });
    }

    public async postCreatorDelete(request: express.Request, response: express.Response) {
        // todo
    }
}

export default CreatorController;
