const SpotifyWebApi = require('spotify-web-api-node');
const SocketServer = require('ws').Server;
const express = require('express');
const path = require('path');
const fs = require("fs");
const credentials = require('./credentials.json');
const app = express();
const router = express.Router();

const PORT = process.env.PORT || 9669;

const scopes = [
  'user-read-private', 'user-read-email',
  'user-read-playback-state', 'user-read-currently-playing',
  'user-modify-playback-state'
];
const state = 'Ledgend';

const spotifyApi = new SpotifyWebApi(credentials);
const authorizeURL = spotifyApi.createAuthorizeURL(scopes, state);

const TOKEN_REFRESH_INTERVAL = 1800000;

// accessToken will eventually contain the access token
let accessToken;
let already_authorized = false;


app.get('/auth', (req, res) => {
    res.sendFile(path.join(__dirname + '/static/auth/index.html'));

    const auth_code = req.query;
    console.log("AUTH CODE:", auth_code);
    if(auth_code.code == null){
      return
    }

    spotifyApi.authorizationCodeGrant(auth_code.code).then(
      (data) => {
        console.log('The token expires in ', data.body['expires_in']);
        console.log('The access token is ', data.body['access_token']);
        console.log('The refresh token is ', data.body['refresh_token']);

        // Set the access token on the API object to use it in later calls
        accessToken = data.body['access_token'];
        already_authorized = true;
        spotifyApi.setAccessToken(data.body['access_token']);
        spotifyApi.setRefreshToken(data.body['refresh_token']);

        // create the auth url object for our broadcast function
        let auth_url = createAuthUrlObject()
        broadcast(JSON.stringify(auth_url));

        // set interval to refresh the token yo
        setInterval(() => {
          refreshAccessToken()
        }, TOKEN_REFRESH_INTERVAL);
    },
    (err) => {
      console.log('Error message:', err);
    }
  );
});


function createAuthUrlObject() {
  let auth_url = {
    type: "auth",
    value: {
      "authorizeURL": authorizeURL,
      "already_authorized": already_authorized,
      "accessToken": accessToken
    }
  };
  return auth_url
}


function refreshAccessToken() {
  spotifyApi.refreshAccessToken().then(
    (data) => {
      console.log('The access token has been refreshed!');
      accessToken = data.body['access_token'];

      // Save the access token so that it's used in future calls
      spotifyApi.setAccessToken(data.body['access_token']);
      let auth_url = createAuthUrlObject()
      broadcast(JSON.stringify(auth_url));
    },
    (err) => {
      console.log('Could not refresh access token', err);
    }
  );
}


app.get('/', function(req, res) {
    res.sendFile(path.join(__dirname + '/static/home/index.html'));
});


//connect path to router
app.use("/auth", router);
app.use("/", router);
app.use(express.static('static'))
let server = app.listen(PORT, function () {
    console.log('Listening on port:', PORT);
})


const wss = new SocketServer({ server });

function broadcast(data){
  wss.clients.forEach(ws => {
    ws.send(data);
  });
}

function checkDataType(data){
  try{
    let json_data = JSON.parse(data);
    return json_data
  }
  catch(err){
    return {"type": "else", "value": data}
  }
}

wss.on('connection', ws => {
  console.log('Połączono o: ' + new Date());
  if(already_authorized){
    let auth_url = {"type": "auth", "value": {"authorizeURL": authorizeURL, "already_authorized": already_authorized, "accessToken": accessToken}};
  }
  else{
    let auth_url = {"type": "auth", "value": {"authorizeURL": authorizeURL, "already_authorized": already_authorized}};
  }
  console.log(auth_url);
  // broadcast(JSON.stringify(auth_url));
  ws.on('message', data => {
    let message_and_type = checkDataType(data);
    // console.log(message_and_type);

    if(message_and_type["type"] == "conn"){
      console.log("New client connected :)", message_and_type["value"]);
    }
    else if(message_and_type["type"] == "auth?"){
      if(already_authorized){
        let auth_url = {"type": "auth", "value": {"authorizeURL": authorizeURL, "already_authorized": already_authorized, "accessToken": accessToken, "returnValue": message_and_type["value"]}};
      }
      else{
        let auth_url = {"type": "auth", "value": {"authorizeURL": authorizeURL, "already_authorized": already_authorized, "returnValue": message_and_type["value"]}};
      }

      broadcast(JSON.stringify(auth_url));
    }

  });
});
