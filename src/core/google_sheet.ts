import * as fs from 'fs';
import { GoogleAuth } from 'google-auth-library';
import { google, sheets_v4 } from 'googleapis';

/** Configuration properties for the google sheet */
export interface GoogleSheetConfig {
    id: string;
    credential_path: string;
    verbose?: boolean;
}

/**
 * Configuration that tells our instance where to write in the google sheet
 */
export interface GoogleSheetWriteConfig {
    sheet_name: string;
    header_range: string;
}

/**
 * The type of data we are expecting to write into the spreadhseet.
 * Header defined as key, value as a string
 */
export type GoogleSheetWriteData = { [header: string]: string };

/**
 * This will come into play when mapping ranges with the columns and rows
 */
export const GOOGLE_CELL_COLUMNS = {
    A: 0,
    B: 1,
    C: 2,
    D: 3,
    E: 4,
    F: 5,
    G: 6,
    H: 7,
    I: 8,
    J: 9,
    K: 10,
    L: 11,
    M: 12,
    N: 13,
    O: 14,
    P: 15,
    Q: 16,
    R: 17,
    S: 18,
    T: 19,
    U: 20,
    V: 21,
    W: 22,
    X: 23,
    Y: 24,
    Z: 25,
} as { [cell_letter: string]: number };

// use a function closure to immediately flip the values and keys in the GOOGLE_CELL_COLUMNS object
export const GOOGLE_CELL_COLUMNS_INVERTED = (() => {
    let result = {} as { [key: number]: string };
    Object.keys(GOOGLE_CELL_COLUMNS).forEach((key) => {
        result[GOOGLE_CELL_COLUMNS[key]] = key;
    });
    return result;
})();

/**
 * Constructs a google sheet instance that handles authentication/getting/setting values/rows
 */
export class GoogleSpreadsheet {
    private config: GoogleSheetConfig;
    private auth: GoogleAuth | undefined;
    private google: sheets_v4.Sheets | undefined;
    private spreadsheet: sheets_v4.Schema$Spreadsheet | undefined;

    /** Constructs a google sheet instance and handles sending/retrieving data
     *
     * @param config configuration details to properly pull update the google sheet
     */
    public constructor(config: GoogleSheetConfig) {
        this.config = config;
        this.auth = undefined;
        this.google = undefined;
        this.spreadsheet = undefined;
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

            const response = await this.google.spreadsheets.get({
                spreadsheetId: this.config.id,
                includeGridData: true,
            });

            if (response.status === 200 && response.data && response.data.sheets) {
                this.spreadsheet = response.data;
            } else {
                this.log('Failed to get google sheet : ' + this.config.id);
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

    private get_headers(sheet: sheets_v4.Schema$Sheet, header_range: GoogleSheetWriteConfig['header_range']) {
        const headers: { [key: string]: string } = {};

        return headers;
    }

    public async write(data: GoogleSheetWriteData, config: GoogleSheetWriteConfig) {
        let sheet: sheets_v4.Schema$Sheet | undefined = undefined;
        if (this.spreadsheet && this.spreadsheet.sheets) {
            // find the target sheet
            for (let i = 0; i < this.spreadsheet.sheets.length; i++) {
                const sheet_iter = this.spreadsheet.sheets[i];
                if (sheet_iter.properties && sheet_iter.properties.title === config.sheet_name) {
                    sheet = sheet_iter;
                    break;
                }
            }
        }

        if (sheet && sheet.data) {
            const headers: { [key: string]: string } = {};

            // this assumes format is in A1:Z1 format
            // columns past Z are not supported at the moment.
            // this portion should eventually be revised but for now it works for our use case
            // will be used as a lower bound comparision
            const header_range = config.header_range.split(':');
            const start_cell = header_range[0].toUpperCase().trim();
            const start_cell_column_index = GOOGLE_CELL_COLUMNS[start_cell.charAt(0)];
            const start_cell_column = GOOGLE_CELL_COLUMNS_INVERTED[start_cell_column_index];
            const start_cell_row = parseInt(start_cell.charAt(1));

            // extract end cell. Which will be the upper bound comparision
            const end_cell = header_range[1].toUpperCase().trim();
            const end_cell_column_index = GOOGLE_CELL_COLUMNS[end_cell.charAt(0)];
            const end_cell_column = GOOGLE_CELL_COLUMNS_INVERTED[end_cell_column_index];

            const end_cell_row = parseInt(end_cell.charAt(1));

            // get headers first so we can validate
            for (let i = 0; i < sheet.data.length; i++) {
                const row = sheet.data[i];
                if (row.rowData) {
                    row.rowData.every((data_row, data_row_index) => {
                        if (data_row.values) {
                            const row_number = data_row_index + 1;
                            data_row.values.forEach((cell_value, column_index) => {
                                const column_letter = GOOGLE_CELL_COLUMNS_INVERTED[column_index];

                                const is_in_range =
                                    column_index >= start_cell_column_index &&
                                    column_index <= end_cell_column_index &&
                                    row_number >= start_cell_row &&
                                    row_number <= end_cell_row;

                                if (is_in_range) {
                                    // find out what the cell value. Prioritizing the user entered value
                                    // apparently accordingly to google api typescript definition this is not a
                                    // gaurantee to be populated. So just to be safe follow up with some alternate sources
                                    let cell_text = '';
                                    if (cell_value.userEnteredValue && cell_value.userEnteredValue.stringValue) {
                                        cell_text = cell_value.userEnteredValue.stringValue;
                                    } else if (cell_value.effectiveValue && cell_value.effectiveValue.stringValue) {
                                        cell_text = cell_value.effectiveValue.stringValue;
                                    } else if (cell_value.formattedValue) {
                                        cell_text = cell_value.formattedValue;
                                    } else {
                                        cell_text = '';
                                    }

                                    if (cell_text.trim().length > 0) {
                                        headers[cell_text] = '';
                                    }
                                }
                                // in the .every() function returning false is equivalent to using 'break' . True is equivalent to using continue;
                                // so if we are in range, continue iterating.
                                // if we are not in range, break out
                                return is_in_range;
                            });
                        }
                    });
                }
            }
        }
    }
}

export default GoogleSpreadsheet;
