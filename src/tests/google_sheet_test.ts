import moment = require('moment');
import GoogleSpreadsheet, { GoogleSheetWriteData } from '../core/google_sheet';

async function main() {
    console.log('Constructing instance');
    // if you do not have access to the workbook
    // please DM Gabe (aka Primal) and you will get granted access
    // without access this test will fail on your local instance
    let spreadsheet = new GoogleSpreadsheet({
        workbook_id: '1uzx0j8aMvZUza8Uq8h5ggGohnBqxnpHR_naK1dgSJfk',
        credential_path: './credentials.json',
        verbose: true,

        sheet_name: 'Signups',
        header_range: 'A1:J1',
    });

    console.log('Attempting authorization');
    const did_authorize = await spreadsheet.authorize();
    let headers = spreadsheet.get_headers();
    let data: GoogleSheetWriteData = {};
    for (let header in headers) {
        data[header] = header + ':Test:' + moment().unix().toString();
    }
    data['Signed Up At'] = moment().unix().toString();
    data['Submitted Timestamp'] = moment().unix().toString();
    // writing
    await spreadsheet.write(data);

    if (!did_authorize) {
        console.log('Failed to authorize');
        return;
    }

    console.log('Check Sheet for results');
}

main()
    .then(() => console.log('Completed'))
    .catch(() => console.log('Failed'));
