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

        // validate
        let errors: ServerResponseError[] = [];

        // cast the body into what we are HOPEFULLY expectig
        let form = request.body as {
            form_token?: string;
            form_data?: string;
        };

        // body response
        let bodyResponse: { [key: string]: unknown } = {};

        const formToken = (form.form_token || '').trim();
        let api_form: Form | undefined = undefined;
        if (!errors.length) {
            api_form = await database.getRepository(Form).findOne({
                where: {
                    token: formToken,
                },
            });

            if (api_form === undefined) {
                errors.push({
                    field: 'form_token',
                    message: 'Form not found',
                });
            }
        }

        let form_json: { [key: string]: string } | undefined = undefined;
        if (!errors.length && form.form_data) {
            try {
                const conv_attempt = JSON.parse(form.form_data);
                form_json = conv_attempt;
            } catch {
                // failed
            }
        }

        if (!errors.length && api_form && form_json) {
            const spreadsheet = new GoogleSpreadsheet({
                workbook_id: api_form.workbook,
                credential_path: './credentials.json',
                verbose: true,
                sheet_name: api_form.sheet_name,
                header_range: api_form.header_range,
            });

            const did_authorize = await spreadsheet.authorize();

            if (did_authorize) {
                // replace timestamp field for submission with ss provided value
                form_json['Submitted Timestamp'] = moment().unix().toString();

                try {
                    const did_save = await spreadsheet.write(form_json);
                    if (did_save) {
                        bodyResponse['saved'] = true;
                    } else {
                        bodyResponse['saved'] = false;
                        errors.push({
                            field: 'form',
                            message: 'Failed to save submission. Try again later',
                        });
                    }
                } catch {
                    errors.push({
                        field: 'form',
                        message: 'Unable to save submission. Try again later',
                    });
                }
            } else {
                errors.push({
                    field: 'form',
                    message: 'Unable to save.',
                });
            }
        }

        // output our errors
        response.json({
            success: errors.length === 0 ? true : false,
            response: bodyResponse,
            errors: errors,
        });
    }
}

export default FeedController;
