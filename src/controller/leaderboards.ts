import * as moment from 'moment';
import * as express from 'express';
import User from '../orm/entity/user';
import Creator from '../orm/entity/creator';
import Application from '../orm/entity/application';
import ApplicationUser from '../orm/entity/application_user';
import { ServerController, ServerResponse, ServerResponseError } from '../server/server_controller';
import { ServerRequest } from '../server/server';
import GoogleSheet, { GoogleSpreadsheet } from '../core/google_sheet';
import Form from '../orm/entity/form';
import Leaderboard from '../orm/entity/leaderboard';

/** these routes can only be accessed by a logged in user */
export class LeaderboardController extends ServerController {
    public constructor() {
        super('/leaderboards');

        this.router.post('/read', this.postRead);
    }

    public async postRead(request: express.Request, response: express.Response) {
        // make sure we are ready to process this as our own api server request that has some additions to it
        let serverRequest = request as ServerRequest;

        // grab database connection
        let database = serverRequest.globals.database.raw();

        // validate
        let errors: ServerResponseError[] = [];

        // cast the body into what we are HOPEFULLY expectig
        let form = request.body as {
            type?: string;
            amount?: string;
        };

        let fetchAmount = parseInt(form.amount || '10');
        if (isNaN(fetchAmount)) {
            fetchAmount = 10;
        }

        // clamp the fetch amount between 10 and 100
        fetchAmount = Math.max(10, Math.min(fetchAmount, 100));

        // body response
        let bodyResponse: { [key: string]: unknown } = {};

        const leaderboardType = (form.type || '').trim();
        let leaderboardEntries: Leaderboard[] = [];
        if (!errors.length) {
            leaderboardEntries = await database.getRepository(Leaderboard).find({
                where: {
                    type: leaderboardType,
                },
            });

            if (leaderboardEntries === undefined) {
                errors.push({
                    field: 'type',
                    message: 'No entries found',
                });
            }
        }

        bodyResponse['results'] = leaderboardEntries;

        // output our errors
        response.json({
            success: errors.length === 0 ? true : false,
            response: bodyResponse,
            errors: errors,
        });
    }
}

export default LeaderboardController;
