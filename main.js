const SpotifyWebApi = require('spotify-web-api-node');
const SocketServer = require('ws').Server;
const express = require('express');
const path = require('path');
const fs = require("fs");
var credentials = require('./credentials.json');
var app = express();
var accessToken;
var already_authorized = false;

var scopes = ['user-read-private', 'user-read-email', 'user-read-playback-state', 'user-read-currently-playing', 'user-modify-playback-state'];
var state = 'Ledgend';



var spotifyApi = new SpotifyWebApi(credentials);
var authorizeURL = spotifyApi.createAuthorizeURL(scopes, state);




var router = express.Router();
var port = process.env.PORT || 9669;
app.get('/auth', function(req, res) {
    res.sendFile(path.join(__dirname + '/static/auth/index.html'));
    var auth_code = req.query;
    console.log("AUTH CODE:", auth_code);
    if(auth_code.code != null){
      spotifyApi.authorizationCodeGrant(auth_code.code).then(
        function(data) {
          console.log('The token expires in ' + data.body['expires_in']);
          console.log('The access token is ' + data.body['access_token']);
          console.log('The refresh token is ' + data.body['refresh_token']);

          // Set the access token on the API object to use it in later calls
          accessToken = data.body['access_token'];
          already_authorized = true;
          spotifyApi.setAccessToken(data.body['access_token']);
          spotifyApi.setRefreshToken(data.body['refresh_token']);
          var auth_url = {type: "auth", value: {"authorizeURL": authorizeURL, "already_authorized": already_authorized, "accessToken": accessToken}};
          broadcast(JSON.stringify(auth_url));
          setInterval(function() {
            spotifyApi.refreshAccessToken().then(
              function(data) {
                console.log('The access token has been refreshed!');
                accessToken = data.body['access_token'];

                // Save the access token so that it's used in future calls
                spotifyApi.setAccessToken(data.body['access_token']);
                var auth_url = {type: "auth", value: {"authorizeURL": authorizeURL, "already_authorized": already_authorized, "accessToken": accessToken}};
                broadcast(JSON.stringify(auth_url));
              },
              function(err) {
                console.log('Could not refresh access token', err);
              }
            );
          }, 1800000);
          // 1800000
        },
        function(err) {
          console.log('Something went wrong!', err);
        }
      );
    }
});

app.get('/', function(req, res) {
    res.sendFile(path.join(__dirname + '/static/home/index.html'));
});


//connect path to router
app.use("/auth", router);
app.use("/", router);
app.use(express.static('static'))
var server = app.listen(port, function () {
    console.log('node.js static content and REST server listening on port: ' + port);
})


const wss = new SocketServer({ server });

function broadcast(data){
  wss.clients.forEach(ws => {
    ws.send(data);
  });
}

function checkDataType(data){
  try{
    var json_data = JSON.parse(data);
    return json_data
  }
  catch(err){
    return {"type": "else", "value": data}
  }
}

wss.on('connection', ws => {
  console.log('Połączono o: ' + new Date());
  if(already_authorized){
    var auth_url = {"type": "auth", "value": {"authorizeURL": authorizeURL, "already_authorized": already_authorized, "accessToken": accessToken}};
  }
  else{
    var auth_url = {"type": "auth", "value": {"authorizeURL": authorizeURL, "already_authorized": already_authorized}};
  }
  console.log(auth_url);
  // broadcast(JSON.stringify(auth_url));
  ws.on('message', data => {
    var message_and_type = checkDataType(data);
    // console.log(message_and_type);

    if(message_and_type["type"] == "conn"){
      console.log("New client connected :)", message_and_type["value"]);
    }
    else if(message_and_type["type"] == "auth?"){
      if(already_authorized){
        var auth_url = {"type": "auth", "value": {"authorizeURL": authorizeURL, "already_authorized": already_authorized, "accessToken": accessToken, "returnValue": message_and_type["value"]}};
      }
      else{
        var auth_url = {"type": "auth", "value": {"authorizeURL": authorizeURL, "already_authorized": already_authorized, "returnValue": message_and_type["value"]}};
      }

      broadcast(JSON.stringify(auth_url));
    }

  });
});
