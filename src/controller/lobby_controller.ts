import * as moment from 'moment';
import * as express from 'express';
import User from '../orm/entity/user';
import Creator from '../orm/entity/creator';
import Application from '../orm/entity/application';
import ApplicationUser from '../orm/entity/application_user';
import { ServerController, ServerResponse, ServerResponseError } from '../server/server_controller';
import { ServerRequest } from '../server/server';
import Lobby from '../orm/entity/lobbies';
import { FindManyOptions, In } from 'typeorm';
import LobbyUser from '../orm/entity/lobby_member';
import * as crypto from 'crypto';

export class LobbyController extends ServerController {
    public constructor() {
        super('/lobbies');

        this.router.get('/get', this.postGet);
        this.router.post('/create', this.postCreate);
        this.router.post('/join', this.postJoin);
    }

    public async postGet(request: express.Request, response: express.Response) {
        // interpret as our own server request interface
        let serverRequest = request as ServerRequest;

        // database
        let database = serverRequest.globals.database.raw();

        // validation errors
        let errors: ServerResponseError[] = [];

        // store the body in this response object
        let bodyResponse: { [key: string]: any } = {};

        // interpret teh body form
        let form = request.body as {
            type?: string;
            code?: string;
            users?: string;
        };

        let formType = (form.type || '').trim();
        if (formType.length === 0) {
            errors.push({
                field: 'type',
                message: 'Please submit a valid type',
            });
        }
        if (!errors.length) {
            let searchConf: FindManyOptions<Lobby> = {
                where: {
                    type: formType,
                    deleted_at: 0,
                },
            };

            if (form.code) {
                (searchConf.where as any)['code'] = (form.code || '').trim();
            }

            let lobbies = await database.getRepository(Lobby).find(searchConf);
            bodyResponse['lobbies'] = lobbies;

            if (form.users && form.users === 'yes') {
                // now grab all lobby members tied to the lobbies obtained
                let lobbyIds = lobbies.map((lobby, lobby_index) => lobby.id);

                // query lobby users directly
                const lobbyUsersRaw: {
                    lobby_id: number;
                    lobby_name: string;
                    user: string;
                }[] = await database
                    .createQueryBuilder()
                    .select(['lobbies.id AS lobby_id', 'lobbies.name AS lobby_name', 'users.display_name_full AS user'])
                    .from('lobby_users', 'lobby_users')
                    .innerJoin('lobbies', 'lobbies', 'lobby_users.lobby = lobbies.id')
                    .innerJoin('users', 'users', 'lobby_users.user = users.id')
                    .where('lobbies.deleted_at = 0')
                    .andWhere('lobbies.id IN (:lobbyIds)')
                    .setParameter('lobbyIds', lobbyIds.join(','))
                    .getRawMany();

                let lobbyUsersFormatted: { [lobby: number]: string[] } = {};
                lobbyUsersRaw.forEach((lobbyUser, lobbyUserIndex) => {
                    if (typeof lobbyUsersFormatted[lobbyUser.lobby_id] === 'undefined') {
                        lobbyUsersFormatted[lobbyUser.lobby_id] = [];
                    }
                    lobbyUsersFormatted[lobbyUser.lobby_id].push(lobbyUser.user);
                });
                bodyResponse['users'] = lobbyUsersFormatted;
            }
        }

        response.json({
            success: errors.length === 0 ? true : false,
            response: bodyResponse,
            errors: errors,
        });
    }

    public async postCreate(request: express.Request, response: express.Response) {
        // interpret as our own server request interface
        let serverRequest = request as ServerRequest;

        // database
        let database = serverRequest.globals.database.raw();

        // validation errors
        let errors: ServerResponseError[] = [];

        // store the body in this response object
        let bodyResponse: { [key: string]: any } = {};

        let form = request.body as {
            type?: string;
            name?: string;
            creator?: string;
        };

        let formType = (form.type || '').trim();
        if (formType.length === 0) {
            errors.push({
                field: 'type',
                message: 'Please specify a type for this lobby',
            });
        }

        let formName = (form.name || '').trim();
        let lobby: Lobby | undefined = undefined;
        if (!errors.length) {
            if (formName.length === 0) {
                errors.push({
                    field: 'name',
                    message: 'Please specify a lobby name',
                });
            } else if (formName.length > 32) {
                errors.push({
                    field: 'name',
                    message: 'Please restrict the name of the lobby to less then 32 characters',
                });
            } else {
                lobby = await database.getRepository(Lobby).findOne({
                    where: {
                        type: formType,
                        name: formName,
                        deleted_at: 0,
                    },
                });

                if (lobby !== undefined) {
                    errors.push({
                        field: 'name',
                        message: 'Lobby already exist with that name',
                    });
                }
            }
        }

        let user: User | undefined = undefined;
        let formUser = (form.creator || '').trim();
        if (!errors.length) {
            user = await database.getRepository(User).findOne({
                where: {
                    token: formUser,
                    deleted_at: 0,
                    banned_at: 0,
                },
            });

            if (user === undefined) {
                errors.push({
                    field: 'user',
                    message: 'User does not exist',
                });
            }
        }

        //
        if (!errors.length && user) {
            let token = crypto
                .createHash('md5')
                .update(formType + moment().unix() + formName + user.display_name_full)
                .digest('hex');

            // create lobby and first lobby user
            let lobbyData: Partial<Lobby> = {
                type: formType,
                name: formName,
                code: token,
                created_at: moment().unix(),
                updated_at: 0,
                deleted_at: 0,
            };

            // save lobby
            lobby = await database.getRepository(Lobby).save(lobbyData);
            if (!lobby) {
                errors.push({
                    field: 'lobby',
                    message: 'Unable to create lobby. Try again later',
                });
            }
        }

        if (!errors.length && user && lobby) {
            let lobbyUser: Partial<LobbyUser> = {
                lobby: lobby.id,
                user: user.id,
            };

            let newLobbyUser = await database.getRepository(LobbyUser).save(lobbyUser);
            if (!newLobbyUser) {
                errors.push({
                    field: 'lobby',
                    message: 'Unable to add user to created lobby',
                });
            }

            bodyResponse['lobby'] = lobby.code;
        }

        response.json({
            success: errors.length === 0 ? true : false,
            response: bodyResponse,
            errors: errors,
        });
    }

    public async postJoin(request: express.Request, response: express.Response) {
        // interpret as our own server request interface
        let serverRequest = request as ServerRequest;

        // database
        let database = serverRequest.globals.database.raw();

        // validation errors
        let errors: ServerResponseError[] = [];

        // store the body in this response object
        let bodyResponse: { [key: string]: any } = {};

        let form = serverRequest.body as {
            type?: string;
            code?: string;
            user?: string;
        };

        let lobby: Lobby | undefined = undefined;
        lobby = await database.getRepository(Lobby).findOne({
            where: {
                type: form.type || '',
                code: form.code || '',
                deleted_at: 0,
            },
        });

        if (lobby === undefined) {
            errors.push({
                field: 'code',
                message: 'Invalid lobby code',
            });
        }

        let user: User | undefined = undefined;
        if (!errors.length) {
            user = await database.getRepository(User).findOne({
                where: {
                    token: form.user || '',
                    deleted_at: 0,
                    banned_at: 0,
                },
            });
        }

        let lobbyUser: LobbyUser | undefined = undefined;
        if (!errors.length && lobby && user) {
            lobbyUser = await database.getRepository(LobbyUser).findOne({
                where: {
                    lobby: lobby.id,
                    user: user.id,
                },
            });

            if (lobbyUser !== undefined) {
                errors.push({
                    field: 'user',
                    message: 'You have already joined this lobby.',
                });
            }
        }

        if (!errors.length && lobby && user) {
            let lobbyUserData: Partial<LobbyUser> = {
                lobby: lobby.id,
                user: user.id,
            };

            lobbyUser = await database.getRepository(LobbyUser).save(lobbyUserData);
            if (!lobbyUser) {
                errors.push({
                    field: 'user',
                    message: 'Failed to add user to lobby, try again later',
                });
            }
        }

        if (!errors.length && lobby && user && lobbyUser) {
            bodyResponse['joined'] = moment().unix();
            bodyResponse['lobby'] = lobby.code;
        }

        response.json({
            success: errors.length === 0 ? true : false,
            response: bodyResponse,
            errors: errors,
        });
    }
}

export default LobbyController;
