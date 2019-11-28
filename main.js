const SpotifyWebApi = require('spotify-web-api-node');
const SocketServer = require('ws').Server;
const express = require('express');
const path = require('path');
const fs = require("fs");
const credentials = require('./credentials.json');
const app = express();
const router = express.Router();

const PORT = process.env.PORT || 9669;

const scopes = ['streaming',
  'user-read-private', 'user-read-email',
  'user-read-playback-state', 'user-read-currently-playing',
  'user-modify-playback-state'
];
const state = 'Ledgend';

const spotifyApi = new SpotifyWebApi(credentials);
const authorizeURL = spotifyApi.createAuthorizeURL(scopes, state);

// const TOKEN_REFRESH_INTERVAL = 30000;
const TOKEN_REFRESH_INTERVAL = 1800000;

// accessToken will eventually contain the access token
let accessToken;
let already_authorized = false;

let player_state = {
  current_track: {
    id: null,
    name: null,
    duration: null,
  },
  state: {
    device_active: false,
    position: null,
    is_paused: null,
    repeat_mode: null,
    shuffle: null,
    time_set: null
  }

}

let tracks_analysis = {
  current_track: {
    id: null,
    analysis: null,
    features: null
  },
  next_track_1: {
    id: null,
    analysis: null,
    features: null
  },
  next_track_2: {
    id: null,
    analysis: null,
    features: null
  }
}


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
  return auth_url;
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
  // TODO: why is there a plus? i mean, you're already using path.join
  // I like it, leave it as it is.
  res.sendFile(path.join(__dirname + '/static/home/index.html'));
});


//connect path to router
app.use("/auth", router);
app.use("/", router);
app.use(express.static('static'));


// defining the express server
const server = app.listen(PORT, () => {
  console.log('Listening on port:', PORT);
});


// defining the websocket server
const ws_server = new SocketServer({ server });


function broadcast(data) {
  ws_server.clients.forEach(ws => {
    ws.send(data);
  });
}


function checkDataType(data) {
  try {
    let json_data = JSON.parse(data);
    return json_data;
  }
  catch(err) {
    return {"type": "else", "value": data};
  }
}

function fetchSingleAnalysis(track_id){
  return new Promise(function(resolve, reject){
    let analysis = spotifyApi.getAudioAnalysisForTrack(track_id)
    .then(function(data) {
      if(data.statusCode == 200){
        return data.body;
      }
      else{
        return null;
      }
    }, function(err) {
      done(err);
    });
    let track_features = spotifyApi.getAudioFeaturesForTrack(track_id)
    .then(function(data2) {
      if(data2.statusCode == 200){
        return data2.body;
      }
      else{
        return null;
      }
    }, function(err) {
      done(err);
    });
    Promise.all([analysis, track_features])
    .then(function(values){
      let return_object =
      {id: track_id,
       analysis: values[0],
       features: values[1]
      };
      // console.log(return_object);
      resolve(return_object);
    });
  });
}

function fetchAnalysis(current_track_id, next_track_1_id, next_track_2_id, eventType="NEW SONG"){
  switch(eventType){
    case "NEW SONG":
    case "SHUFFLE ON":
    case "SHUFFLE OFF":
    case "REPEAT MODE 0":
    case "PLAY START":
      let ct_promise = fetchSingleAnalysis(current_track_id).then(function(data){
        tracks_analysis.current_track = data;
        console.log("CUR:", tracks_analysis.current_track.id);
        let nt1_promise = fetchSingleAnalysis(next_track_1_id).then(function(data){
          tracks_analysis.next_track_1 = data;
          console.log("N1:", tracks_analysis.next_track_1.id);
          let nt2_promise = fetchSingleAnalysis(next_track_2_id).then(function(data){
            tracks_analysis.next_track_2 = data;
            console.log("N2:", tracks_analysis.next_track_2.id);
          });
        });
      });
      break;
    case "SONG SKIP":
      if(tracks_analysis.next_track_1.id == current_track_id){
        tracks_analysis.current_track = tracks_analysis.next_track_1;
        tracks_analysis.next_track_1= tracks_analysis.next_track_2;
        let nt2_promise = fetchSingleAnalysis(next_track_2_id).then(function(data){
          tracks_analysis.next_track_2 = data;
          console.log("CUR:", tracks_analysis.current_track.id);
          console.log("N1:", tracks_analysis.next_track_1.id);
          console.log("N2:", tracks_analysis.next_track_2.id);
        });
      }
      break;
    case "QUEUE CHANGED":
      if(tracks_analysis.next_track_2.id == next_track_1_id
        && tracks_analysis.next_track_1.id == next_track_2_id)
      {
        let tmp = tracks_analysis.next_track_1;
        tracks_analysis.next_track_1 = tracks_analysis.next_track_2;
        tracks_analysis.next_track_2 = tmp;
        console.log("QUEUE SWAP!");
        console.log("CUR:", tracks_analysis.current_track.id);
        console.log("N1:", tracks_analysis.next_track_1.id);
        console.log("N2:", tracks_analysis.next_track_2.id);
      }
      else if(tracks_analysis.next_track_2.id == next_track_1_id){
        tracks_analysis.next_track_1 = tracks_analysis.next_track_2;
        let nt2_promise = fetchSingleAnalysis(next_track_2_id).then(function(data){
          tracks_analysis.next_track_2 = data;
          console.log("1st = 2nd!");
          console.log("CUR:", tracks_analysis.current_track.id);
          console.log("N1:", tracks_analysis.next_track_1.id);
          console.log("N2:", tracks_analysis.next_track_2.id);
        });
      }
      else if(tracks_analysis.next_track_1.id == next_track_1_id){
        let nt2_promise = fetchSingleAnalysis(next_track_2_id).then(function(data){
          tracks_analysis.next_track_2 = data;
          console.log("NEW 2nd!");
          console.log("CUR:", tracks_analysis.current_track.id);
          console.log("N1:", tracks_analysis.next_track_1.id);
          console.log("N2:", tracks_analysis.next_track_2.id);
        });
      }
      else{
        let nt1_promise = fetchSingleAnalysis(next_track_1_id).then(function(data){
          tracks_analysis.next_track_1 = data;
          let nt2_promise = fetchSingleAnalysis(next_track_2_id).then(function(data){
            tracks_analysis.next_track_2 = data;
            console.log("BRAND NEW!");
            console.log("CUR:", tracks_analysis.current_track.id);
            console.log("N1:", tracks_analysis.next_track_1.id);
            console.log("N2:", tracks_analysis.next_track_2.id);
          });
        });
      }
      break;
  }
}


ws_server.on('connection', (ws) => {
  console.log('Połączono o: ' + new Date());

  ws.on('message', (data) => {
    // console.log(message_and_type);

    const message_and_type = checkDataType(data);
    const type = message_and_type["type"];

    switch(type) {
      case "conn":
        console.log("New client connected :)", message_and_type["value"]);

        break;

      case "auth?":
        // creating auth url
        let auth_url = createAuthUrlObject();
        if( !already_authorized ){
          delete auth_url.value.accessToken;
        }
        auth_url.returnValue = message_and_type["value"];

        console.log('auth_url:', auth_url);

        broadcast(JSON.stringify(auth_url));

        break;
      case "change":
        let reason = message_and_type["value"][0];
        let change = message_and_type["value"][1];
        if(!change.deviceChanged){
          player_state.state.position = change.position;
          player_state.state.is_paused = change.is_paused;
          player_state.state.repeat_mode = change.repeat_mode;
          player_state.state.shuffle = change.shuffle;
          player_state.state.time_set = change.timestamp;
          player_state.current_track.id = change.current_track.id;
          player_state.current_track.name = change.current_track.name;
          player_state.current_track.duration = change.current_track.duration;
          console.log("EVENT");
          if(!player_state.device_active){
            if(reason == "PLAY"){
              reason = "PLAY START";
              player_state.device_active = true;
            }
          }
          fetchAnalysis(
            change.current_track.id,
            change.next_tracks[0].id,
            change.next_tracks[1].id,
            reason
          );
        }
      player_state.state.device_active = false;
      }
  });
});
