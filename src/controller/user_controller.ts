import User from '../orm/entity/user';
import { ServerController, ServerResponse, ServerResponseError } from '../server/server_controller';
import { Repository } from 'typeorm';
import { Server, ServerRequest } from '../server/server';
import * as moment from 'moment';
import * as express from 'express';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

export interface UserSession {
    user?: string;
    applications?: { [appName: string]: { [key: string]: unknown } };
}

export class UserController extends ServerController {
    public constructor() {
        super('/user');

        // create routes
        this.router.get('/session', this.getSession);

        this.router.get('/logout', this.getLogout);

        this.router.post('/login', this.postLogin);
        this.router.post('/signup', this.postSignup);
    }

    public async postSignup(request: express.Request, response: express.Response) {
        // make sure we are ready to process this as our own api server request that has some additions to it
        let serverRequest = request as ServerRequest;

        // this is what we are hoping to get in, make sure to appropriately type the body
        let form = request.body as {
            email?: string;
            password?: string;
            passwordConfirm?: string;
            displayName?: string;
        };

        let bodyResponse: { [key: string]: unknown } = {};

        // validate
        let errors: ServerResponseError[] = [];

        // make sure we have a password
        let userPassword = form.password !== undefined ? form.password : '';
        if (!errors.length) {
            if (userPassword.length === 0) {
                errors.push({
                    field: 'password',
                    message: 'Please  supply a password',
                });
            } else if (userPassword.length < 8) {
                errors.push({
                    field: 'password',
                    message: 'Please supply a password that is 8 or more characters long',
                });
            }
        }

        // compare passwords
        let userPasswordConfirm = form.passwordConfirm !== undefined ? form.passwordConfirm : '';
        if (!errors.length) {
            if (userPasswordConfirm.length === 0) {
                errors.push({
                    field: 'passwordConfirm',
                    message: 'Please confirm your password',
                });
            } else if (userPasswordConfirm.localeCompare(userPassword) !== 0) {
                errors.push({
                    field: 'passwordConfirm',
                    message: 'Passwords do not match',
                });
            }
        }

        // validate email
        let userEmail = form.email !== undefined ? form.email.trim().toLowerCase() : '';
        if (!errors.length) {
            if (userEmail.length === 0) {
                errors.push({
                    field: 'email',
                    message: 'Please supply a email address',
                });
            } else {
                let userRepository = serverRequest.globals.database.raw().getRepository(User);
                // look up in database to see if this email is taken

                let user = await userRepository.findOne({
                    where: {
                        email: userEmail,
                    },
                });

                if (user !== undefined) {
                    errors.push({
                        field: 'email',
                        message: 'This email is already taken.',
                    });
                }
            }
        }

        // validate display name
        let userDisplayNameFull = form.displayName !== undefined ? form.displayName.trim() : '';
        let userDisplayName = userDisplayNameFull.toLowerCase();
        if (!errors.length) {
            if (userDisplayName.length === 0) {
                errors.push({
                    field: 'displayName',
                    message: 'Please supply a display name',
                });
            } else if (userDisplayName.length > 32) {
                errors.push({
                    field: 'displayName',
                    message: 'Please shorten display name to less then 32 characters',
                });
            } else {
                let userRepository = serverRequest.globals.database.raw().getRepository(User);
                let user = await userRepository.findOne({
                    where: {
                        display_name: userDisplayName,
                    },
                });
                if (user !== undefined) {
                    errors.push({
                        field: 'displayName',
                        message: 'This display name has already been taken.',
                    });
                }
            }
        }

        // create user
        if (!errors.length) {
            let user: Partial<User> = {
                email: userEmail,
                password: await bcrypt.hash(userPassword, 10),
                display_name: userDisplayName,
                display_name_full: userDisplayNameFull,
                token: crypto
                    .createHash('md5')
                    .update(userEmail + userDisplayNameFull + moment().unix())
                    .digest('hex'),
                token_secret: crypto
                    .createHash('md5')
                    .update(userEmail + userPassword + moment().unix())
                    .digest('hex'),
                created_at: moment().unix(),
                updated_at: 0,
                last_login_at: 0,
                deleted_at: 0,
                banned_at: 0,
                verified_at: 0,
            };

            let userRepository = serverRequest.globals.database.raw().getRepository(User);
            await userRepository.save(user);

            bodyResponse['user'] = {
                created: user.created_at,
                email: user.email,
                token: user.token,
            };
        }

        let serverResponse: ServerResponse = {
            success: errors.length > 0,
            response: bodyResponse,
            errors: errors,
        };
        response.json(serverResponse);
    }

    /**
     * Gets any session information if possible
     * @param request
     * @param response
     */
    public async getSession(request: express.Request, response: express.Response) {
        let session = request.session as UserSession;
        let serverResponse: ServerResponse = {
            success: true,
            response: {},
            errors: [],
        };

        let userFound = false;
        if (session.user !== undefined) {
            // make sure we are ready to process this as our own api server request that has some additions to it
            let serverRequest = request as ServerRequest;

            let sessionUser = await serverRequest.globals.database
                .raw()
                .getRepository(User)
                .findOne({
                    where: {
                        token: session.user.toString(),
                    },
                });
            userFound = sessionUser !== undefined;
        }

        if (!userFound) {
            serverResponse.response = {
                valid: false,
                user: null,
            };
            request.session.destroy(() => {
                response.json(serverResponse);
            });
        } else {
            serverResponse.response = {
                valid: true,
                user: session.user !== undefined ? session.user.toString() : null,
            };
            response.json(serverResponse);
        }
    }

    /**
     * Handles a POST request to login the user
     * @param request
     * @param response
     */
    public async postLogin(request: express.Request, response: express.Response) {
        // make sure we are ready to process this as our own api server request that has some additions to it
        let serverRequest = request as ServerRequest;

        // this is what we are hoping to get in, make sure to appropriately type the body
        let form = request.body as {
            method?: 'password' | 'token';
            email?: string;
            password?: string;
        };

        let bodyResponse: { [key: string]: unknown } = {};

        // validate form inputs
        let loginMethod: 'password' | 'token' =
            form.method !== undefined && form.method.trim().toLowerCase() === 'token' ? 'token' : 'password';
        let loginEmail = form.email !== undefined ? form.email.toLowerCase().trim() : '';
        let loginPassword = form.password !== undefined ? form.password : '';

        let repository = serverRequest.globals.database.raw().getRepository(User);
        let user: User | undefined = undefined;
        switch (loginMethod) {
            /*case 'token': for now this is not supported. Need to flesh this out more
                user = await repository.findOne({
                    where: {
                        email: loginEmail,
                        token: loginPassword,
                    },
                });
                break; */
            case 'password':
            default:
                user = await repository.findOne({
                    where: {
                        email: loginEmail,
                    },
                });

                if (user) {
                    let passwordsMatch = await bcrypt.compare(loginPassword, user.password.toString());

                    // if our passwords do not match, immediately undefine our entity
                    user = passwordsMatch === true ? user : undefined;
                } else {
                    user = undefined;
                }
                break;
        }

        // if we have a user after doing either of our login methods we can proceed
        if (user !== undefined) {
            // update our login time
            user.last_login_at = moment().unix();
            await repository.save(user);

            // in our session store our users
            (request.session as UserSession).user = user.token.toString();

            // provide a direct mapping to the user in the session
            let hub: Partial<User> = {
                token: user.token.toString(),
                token_secret: user.token_secret.toString(),
                display_name: user.display_name,
                display_name_full: user.display_name_full,
                last_login_at: user.last_login_at,
                created_at: user.created_at,
                deleted_at: user.deleted_at,
                banned_at: user.banned_at,
                verified_at: user.verified_at,
            };

            // since we are logging in we can safely recreate the applications literal
            (request.session as UserSession).applications = {
                hub: hub,
            };

            bodyResponse['user'] = hub;
            bodyResponse['loginMethod'] = loginMethod;
            request.session.save((err) => {
                response.json({
                    success: true,
                    response: bodyResponse,
                    errors: [err],
                });
            });
        } else {
            bodyResponse['user'] = 'Invalid Credentials';
            bodyResponse['loginMethod'] = loginMethod;
            request.session.destroy((err) => {
                response.json({
                    success: true,
                    response: bodyResponse,
                    errors: [err],
                });
            });
        }
    }

    public getLogout(request: express.Request, response: express.Response) {
        request.session.destroy((err) => {
            response.json({
                success: true,
                response: {
                    message: 'User has been logged out',
                },
                errors: [],
            });
        });
    }
}

export default UserController;
