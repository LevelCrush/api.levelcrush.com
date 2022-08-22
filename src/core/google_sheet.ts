import * as fs from 'fs';
import { GoogleAuth } from 'google-auth-library';
import { google, sheets_v4 } from 'googleapis';
import { ideahub } from 'googleapis/build/src/apis/ideahub';

/** Configuration properties for the google sheet */
export interface GoogleSheetConfig {
    workbook_id: string;
    credential_path: string;
    verbose?: boolean;
    sheet_name: string;
    header_range: string;
}

/**
 * The type of data we are expecting to write into the spreadhseet.
 * Header defined as key, value as a string
 */
export type GoogleSheetWriteData = { [header: string]: string };

/**
 * Constructs a google sheet instance that handles authentication/getting/setting values/rows
 */
export class GoogleSpreadsheet {
    private config: GoogleSheetConfig;
    private auth: GoogleAuth | undefined;
    private google: sheets_v4.Sheets | undefined;
    private header_values: string[];

    /** Constructs a google sheet instance and handles sending/retrieving data
     *
     * @param config configuration details to properly pull update the google sheet
     */
    public constructor(config: GoogleSheetConfig) {
        this.config = config;
        this.auth = undefined;
        this.google = undefined;
        this.header_values = [];
    }

    private log(msg: any) {
        if (this.config.verbose) {
            console.log(msg);
        }
    }

    /**
     *
     * @returns True if succesfully authorized.
     * False if any of the following conditions are met
     * * Non existing credentials
     * * Unauthorized credentials respective to the sheet
     * * Failed parsing of credentials
     * * Failed network request to authorize
     * * Spreadsheet does not exist
     */
    public async authorize(): Promise<boolean> {
        this.log('Attempting to authorize');
        try {
            this.log('Constructing google authentication instance');

            // configure authentication and specify scopes
            // technically since we use a serve account here scopes are not needed
            // but its good to know what our intent is here
            this.auth = new google.auth.GoogleAuth({
                scopes: [
                    'https://www.googleapis.com/auth/drive',
                    'https://www.googleapis.com/auth/drive.file',
                    'https://www.googleapis.com/auth/spreadsheets',
                ],
                keyFile: this.config.credential_path,
            });

            this.log('Finished constructing google authentication instance');

            this.log('Constructing google sheet instance');
            // our sheet instance relative to google sheets
            this.google = google.sheets({
                version: 'v4', // this is the default for the api **currently**
                auth: this.auth,
            });

            this.log('Finished constructing. Attempting to get google sheet');

            this.log('Grabbing Cells in the header range');
            const target_range = this.config.sheet_name + '!' + this.config.header_range;
            const response = await this.google.spreadsheets.values.get({
                spreadsheetId: this.config.workbook_id,
                range: target_range,
            });

            if (response.data.values) {
                this.log('Values found. Copying to header values');
                response.data.values.every((value, index) => {
                    value.forEach((cell_v) => {
                        this.header_values.push(cell_v);
                    });
                    return false; // we will only process the first range
                });
                this.log('Total Headers found: ' + this.header_values.length);
            }

            if (this.header_values.length === 0) {
                this.log('Failed to get google sheet : ' + this.config.workbook_id);
                // this throw will trigger our 'false' value return with the catch
                // keeping it compliant with the above calls
                // there is a better way to do this. But for now it works
                throw new Error('Unable to retrieve google sheet');
            }

            return true;
        } catch (err) {
            this.log('An error occurrred while getting the google sheet');
            this.log(err);
            return false;
        }
    }

    public get_headers() {
        let headers: { [key: string]: number } = {};
        this.header_values.forEach((header, header_index) => {
            headers[header] = header_index;
        });
        return headers;
    }

    public async write(data: GoogleSheetWriteData) {
        if (this.google && this.header_values.length > 0) {
            // obtain headers based off our range
            const headers = this.get_headers();

            // begin formatting or 'data' into a proper array that will match where our headers are placed
            // this is important. Because headers may look like so
            // Headers ---  A B C D E F G
            // And then may be rearranged into
            // Headers --- B F G A
            // and if we simply pass our data in 1:1 it will not map correctly
            // this resolves the issue

            let formatted_row: string[] = [];
            for (let i = 0; i < Object.keys(headers).length; i++) {
                formatted_row[i] = 'N/A'; // prefill empty value
            }

            let start_column = 0;
            let end_column = 0;
            for (let field in data) {
                const matching_index = typeof headers[field] != 'undefined' ? headers[field] : -1;
                if (matching_index >= 0) {
                    formatted_row[matching_index] = data[field];

                    if (formatted_row[matching_index].length > 50000) {
                        formatted_row[matching_index] = formatted_row[matching_index].substring(0, 50000);
                    }

                    start_column = Math.min(start_column, matching_index);
                    end_column = Math.max(end_column, matching_index);
                }
            }

            const request_body: sheets_v4.Schema$ValueRange = {
                values: [formatted_row],
            };

            const target_range = this.config.sheet_name + '!' + this.config.header_range;

            this.log('Writing to table (starting at): ' + target_range);

            try {
                await this.google.spreadsheets.values.append({
                    spreadsheetId: this.config.workbook_id,
                    range: target_range,
                    valueInputOption: 'RAW',
                    requestBody: request_body,
                });
                return true;
            } catch (err) {
                console.log(err);
                return false;
            }
        }
    }
}

export default GoogleSpreadsheet;
