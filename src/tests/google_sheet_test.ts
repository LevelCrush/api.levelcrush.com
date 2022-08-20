import GoogleSpreadsheet from '../core/google_sheet';

async function main() {
    console.log('Constructing instance');
    let spreadsheet = new GoogleSpreadsheet({
        id: '1uzx0j8aMvZUza8Uq8h5ggGohnBqxnpHR_naK1dgSJfk',
        credential_path: './credentials.json',
        verbose: true,
    });

    console.log('Attempting authorization');
    const did_authorize = await spreadsheet.authorize();

    await spreadsheet.write(
        { 'Time Zone': 'hello world' },
        {
            sheet_name: 'Signups',
            header_range: 'A1:J1',
        },
    );

    if (!did_authorize) {
        console.log('Failed to authorize');
        return;
    }
}

main()
    .then(() => console.log('Completed'))
    .catch(() => console.log('Failed'));
