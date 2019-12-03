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

const SECTION_DURATION_CONFIDENCE = 0.26;

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
    features: null,
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

function mapVal(x, in_min, in_max, out_min, out_max){
  let value = (x - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
  if(value>out_max){
    return out_max;
  }
  else if(value<out_min){
    return out_min
  }
  else{
    return value;
  }
}


function getRandom(min, max, round=false) {
  if(round == false){
    return Math.floor(Math.random() * (max - min) + min);
  }
  else{
    return roundToTwo(Math.random() * (max - min) + min);
  }
}


function roundToTwo(num) {
  return +(Math.round(num + "e+2")  + "e-2");
}

function generateColorsHue(colors_list, happy){
  let color;
  if(happy){
    color = roundToTwo(getRandom(0, 5, false)/10);
  }
  else{
    color = roundToTwo(getRandom(5, 10, false)/10);
  }
  if(colors_list.includes(color)){
    return generateColorsHue(colors_list, happy);
  }
  else{
    colors_list.push(color);
    return color;
  }
}

function limit(x, min, max){
  if(x < min){
    return min;
  }
  else if(x>max){
    return max;
  }
  return x;
}

function generateColors(features, num_of_colors=4){
  let valueRangeBottom = roundToTwo(mapVal(features.tempo, 100, 150, 0.5, 1));
  let colors_hsv = [];
  let colors_h = [];
  let colors_s = [];
  let offset = roundToTwo(Math.random()/10);
  let happy_colors_chance = 0.5;
  if(features.valence>0.65){
    happy_colors_chance = happy_colors_chance + features.valence/3;
  }
  else{
    happy_colors_chance = happy_colors_chance - ((1-features.valence)/3);
  }
  happy_colors_chance = roundToTwo(happy_colors_chance);
  for(let i=0; i<num_of_colors; i++){
    let happy = Math.random()<happy_colors_chance;
    colors_h[i] = generateColorsHue(colors_h, happy);
  }
  for(let i=0; i<num_of_colors; i++){
    colors_h[i] = roundToTwo(colors_h[i] + offset), 0, 1;
    colors_s[i] = getRandom(valueRangeBottom, 1, true);
    colors_hsv.push([colors_h[i], colors_s[i], 1]);
  }
  return colors_hsv;
}

function secondsToMinutes(seconds){
  let minutes = Math.floor(seconds/60);
  let _seconds = Math.floor(seconds%60);
  return [minutes, _seconds];
}

function shuffleArray(array) {
    for (var i = array.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var temp = array[i];
        array[i] = array[j];
        array[j] = temp;
    }
    return array;
}

function genBeatsAnims(sections, beats, colors_array, anims_array, repeat, song_position){
  return new Promise(function(resolve, reject){
    let beats_generated = [];
    for(let j = 0; j<sections.length; j++){
      let colors_list = [...colors_array];
      if(j%2 == 0){
        colors_list.pop();
      }
      else {
        colors_list.shift();
        colors_list.reverse();
      }
      sections[j].colors_list = colors_list;
    }
    sections.forEach((section, index) => {
      let section_animations = [];
      let how_many = anims_array.length * section.time_signature ;
      let tracking = 0;
      for(let bi = 0; bi<beats.length; bi++){
        let animation_counter = 0;
        if(beats[bi].start > section.start &&
          beats[bi].start < (section.start + section.duration)){
            if(bi%how_many == 0){
              anims_array = shuffleArray(anims_array)
            }
            // console.log("COLORS_LIST", section);
            let anim_name = anims_array[tracking%anims_array.length];
            if(bi%section.time_signature == 0){
              tracking++;
            }

            section_animations.push({name: anim_name, color: section.colors_list[bi%section.colors_list.length], start: beats[bi].start, duration: beats[bi].duration});
          }
        }
        // console.log(section_animations);
        beats_generated = beats_generated.concat(section_animations);
      });
    console.log("BEATS_GEN", beats_generated);
    resolve(beats_generated);
  });
}


function describeSections(ana){
  return new Promise(function(resolve, reject){
    let end_of_fade_in = ana.track.end_of_fade_in;
    let start_of_fade_out = ana.track.start_of_fade_out;
    let duration = ana.track.duration;
    let beats = ana.beats;
    let sections = ana.sections;
    let segments = ana.segments;
    let chosen_segments = [];
    let the_loudest_section = {
      index: 0,
      loudness: sections[0].loudness
    };


    // console.log(sections);
    let i = 1;

    for(let i = 1; i<sections.length-1; i++){
      if(sections[i].confidence < SECTION_DURATION_CONFIDENCE){
        let updated_section;
        let splice_index;
        if(sections[i-1].confidence > sections[i+1]){
          updated_section = sections[i+1];
          updated_section.start = sections[i].start;
        }
        else{
          updated_section = sections[i-1];
        }
        updated_section.duration = updated_section.duration + sections[i].duration;
        // updated_section.confidence = sections[i].confidence;
        updated_section.loudness = (updated_section.loudness + sections[i].loudness)/2;
        updated_section.tempo = (updated_section.tempo + sections[i].tempo)/2;
        if(updated_section.key_confidence < sections[i].key_confidence){
          updated_section.key_confidence = sections[i].key_confidence;
          updated_section.key = sections[i].key;
        }
        if(updated_section.mode_confidence < sections[i].mode_confidence){
          updated_section.mode_confidence = sections[i].mode_confidence;
          updated_section.mode = sections[i].mode;
        }
        if(updated_section.time_signature_confidence < sections[i].time_signature_confidence){
          updated_section.time_signature_confidence = sections[i].time_signature_confidence;
          updated_section.time_signature = sections[i].time_signature;
        }
        sections.splice(i, 1);
      }
    }
    for(let i = 0; i<sections.length; i++){
      if(sections[i].loudness > the_loudest_section.loudness){
        the_loudest_section.index = i;
        the_loudest_section.loudness = sections[i].loudness;
      }
      if(i == 0){
        sections[i].duration = sections[i].duration - 1;
      }
      else {
        sections[i].start = sections[i].start - 1;
      }
      let start_m = secondsToMinutes(sections[i].start);
      sections[i].start_m = start_m;
      sections[i].end_m =  secondsToMinutes(sections[i].start+sections[i].duration);
    }
    // console.log("\n\nPO:\n");
    // console.log(sections);
    // console.log("loudest", the_loudest_section);
    let section_pointer = 0;
    let already_passed = false;
    for(let j = 0; j<segments.length; j++){
      if(Math.abs(segments[j].start-sections[section_pointer].start)<1){
        already_passed = false;
        // console.log(segments[j]);
      }
      else if(already_passed == false){
        already_passed = true;
        if(section_pointer<sections.length-1){
          section_pointer++;
        }
      }
    }
    let return_object = {
      sections: sections,
      loudest: the_loudest_section
    }
    resolve(return_object);
  });

}


function songClimate(features){
  return new Promise(function(resolve, reject){
    //add colors and some randomness
    // happy colors: hue<180. sad colors: hue>180
    let song_colors = generateColors(features, 5);
    let animations = ["sweep", "pulse", "fmfs", "GradientOverTime"];
    let strobo_present = false;
    let energetic = features.danceability + features.energy;
    if(energetic > 1.25){
      animations.push("police");
      if(features.tempo>125 &&
        energetic > 1.38 &&
        features.valence < 0.67){
        strobo_present = true;
      }
      if(features.tempo>115){
        animations.push("pingpong");
      }
      if(features.tempo>125 && features.valence < 0.6){
        animations.push("randomflashes");
      }
    }
    let return_object = {
      song_colors: song_colors,
      animations: animations,
      strobo: strobo_present
    }
    resolve(return_object);
  });
}

function generateAnims(track){
  songClimate(track.features).then((climate) => {
    describeSections(track.analysis).then((sections_describtion) => {
      console.log("climate",climate);
      genBeatsAnims(sections_describtion.sections, track.analysis.beats, climate.song_colors, climate.animations);
    });
  });
  // console.log(climate);
  // console.log(sections_describtion);
  // console.log(beats_anims_array);
}

function fetchSingleAnalysis(track_id){
  return new Promise(function(resolve, reject){
    let analysis = spotifyApi.getAudioAnalysisForTrack(track_id)
    .then(function(data) {
      if(data.statusCode == 200){
        let return_value = data.body;
        delete return_value.track.codestring;
        delete return_value.track.code_version;
        delete return_value.track.echoprintstring;
        delete return_value.track.echoprint_version;
        delete return_value.track.synchstring;
        delete return_value.track.synch_version;
        delete return_value.track.rhythmstring;
        delete return_value.track.rhythm_version;
        return return_value;
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
      // console.log(return_object.features);
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
        generateAnims(data);
        // console.log("CUR:", tracks_analysis.current_track.id);
        let nt1_promise = fetchSingleAnalysis(next_track_1_id).then(function(data){
          tracks_analysis.next_track_1 = data;
          // console.log("N1:", tracks_analysis.next_track_1.id);
          let nt2_promise = fetchSingleAnalysis(next_track_2_id).then(function(data){
            tracks_analysis.next_track_2 = data;
            // console.log("N2:", tracks_analysis.next_track_2.id);
          });
        });
      });
      break;
    case "SONG SKIP":
      if(tracks_analysis.next_track_1.id == current_track_id){
        tracks_analysis.current_track = tracks_analysis.next_track_1;
        tracks_analysis.next_track_1= tracks_analysis.next_track_2;
        generateAnims(tracks_analysis.current_track);
        let nt2_promise = fetchSingleAnalysis(next_track_2_id).then(function(data){
          tracks_analysis.next_track_2 = data;
          // console.log("CUR:", tracks_analysis.current_track.id);
          // console.log("N1:", tracks_analysis.next_track_1.id);
          // console.log("N2:", tracks_analysis.next_track_2.id);
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
        // console.log("QUEUE SWAP!");
        // console.log("CUR:", tracks_analysis.current_track.id);
        // console.log("N1:", tracks_analysis.next_track_1.id);
        // console.log("N2:", tracks_analysis.next_track_2.id);
      }
      else if(tracks_analysis.next_track_2.id == next_track_1_id){
        tracks_analysis.next_track_1 = tracks_analysis.next_track_2;
        let nt2_promise = fetchSingleAnalysis(next_track_2_id).then(function(data){
          tracks_analysis.next_track_2 = data;
          // console.log("1st = 2nd!");
          // console.log("CUR:", tracks_analysis.current_track.id);
          // console.log("N1:", tracks_analysis.next_track_1.id);
          // console.log("N2:", tracks_analysis.next_track_2.id);
        });
      }
      else if(tracks_analysis.next_track_1.id == next_track_1_id){
        let nt2_promise = fetchSingleAnalysis(next_track_2_id).then(function(data){
          tracks_analysis.next_track_2 = data;
          // console.log("NEW 2nd!");
          // console.log("CUR:", tracks_analysis.current_track.id);
          // console.log("N1:", tracks_analysis.next_track_1.id);
          // console.log("N2:", tracks_analysis.next_track_2.id);
        });
      }
      else{
        let nt1_promise = fetchSingleAnalysis(next_track_1_id).then(function(data){
          tracks_analysis.next_track_1 = data;
          let nt2_promise = fetchSingleAnalysis(next_track_2_id).then(function(data){
            tracks_analysis.next_track_2 = data;
            // console.log("BRAND NEW!");
            // console.log("CUR:", tracks_analysis.current_track.id);
            // console.log("N1:", tracks_analysis.next_track_1.id);
            // console.log("N2:", tracks_analysis.next_track_2.id);
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
          console.log(reason);
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
