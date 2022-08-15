import * as console  from 'console';
import * as fs from 'fs';

import pkg from 'googleapis';
import { sheets } from 'googleapis/build/src/apis/sheets';
const {google,OAuth2} = pkg;

const  TOKEN_PATH = 'token.json';

 class Sheets{
  id = process.env["SHEETS_ID"]
  values = []



  /* this file is still work in progress however it works. 
  need an oauth2 generated token file from the node.js quickstart example located here https://developers.google.com/sheets/api/quickstart/nodejs
  */
async start(val){
fs.readFile('credentials.json', (err, content) => {
  if (err) return console.log('Error loading client secret file:', err);
  // Authorize a client with credentials, then call the Google Sheets API.
  values = val
 this.authorize(JSON.parse(content), this.CallSheet);
});
}

  authorize(credentials, callback) {
  const {client_secret, client_id, redirect_uris} = credentials.web;
  const oAuth2Client = new google.auth.OAuth2(
      client_id, client_secret, redirect_uris[0]);

  
  fs.readFile(TOKEN_PATH, (err, token) => {
    if (err) return console.log(err);
    oAuth2Client.setCredentials(JSON.parse(token));
    callback(oAuth2Client);
  });
}




 async CallSheet(auth) {
  const sheets = google.sheets({version: 'v4', auth});
  var dat = []
 await sheets.spreadsheets.values.get({
    spreadsheetId: id,
    range: 'Signup',
  }, (err, res) => {
    if (err) return console.log('The API returned an error: ' + err);
    dat = res.data.values
    this.WriteSheet(auth)

   
  });

 
}


async WriteSheet(auth){
  try {
    const sheets = google.sheets({version: 'v4', auth});
    
    let resource = {
      values:dat,
  };
  let temp = dat
  console.log(dat.length)
  temp[temp.length] = values
  resource.values = temp;
    const result =   sheets.spreadsheets.values.update({
      spreadsheetId: id,
      range: 'Signup',
      valueInputOption: 'RAW',
      resource  
,
    });
} catch(err) {
    console.log(err)
}
}


}
 

export default {Sheets};