
function checkDataType(data){
  try {
    const json_data = JSON.parse(data);
    return json_data;
  }
  catch(err) {
    return {"type": "else", "value": data};
  }
}

let already = false;
let prev_state;
function stateToTrackObject(state){

  let info = new Object;
  if(state == null){
    info.deviceChanged = true;
    return info;
  }
  info.deviceChanged = false; //v
  info.duration = state.duration; //
  info.is_paused = state.paused; //v
  info.position = state.position;
  info.repeat_mode = state.repeat_mode; //v
  info.restrictions = state.restrictions; //v
  info.shuffle = state.shuffle; //v
  info.timestamp = state.timestamp;
  info.current_track = {id: state.track_window.current_track.id, //v
                      name: state.track_window.current_track.name,
                      duration: state.track_window.current_track.duration_ms
                      };
  info.next_tracks = []; //v
  if(typeof state.track_window.next_tracks[0].id !== 'undefined'){
    info.next_tracks[0] = {id: state.track_window.next_tracks[0].id,
      name: state.track_window.next_tracks[0].name,
      duration: state.track_window.next_tracks[0].duration_ms
    };
  }
  if(typeof state.track_window.next_tracks[1].id !== 'undefined'){
    info.next_tracks[1] = {id: state.track_window.next_tracks[1].id,
                        name: state.track_window.next_tracks[1].name,
                        duration: state.track_window.next_tracks[1].duration_ms
                        };
  }
  return info;
}

function diffTrackObjects(object_new, object_old){
  if(Object.is(object_new, object_old)){
    return "NOTHING";
  }
  console.log(object_new, object_old)
  if(object_new.deviceChanged){
    return "DEVICE INACTIVE";
  }
  else if(object_new.current_track.id != object_old.current_track.id){
    if(object_new.current_track.id == object_old.next_tracks[0].id){
      return "SONG SKIP";
    }
    else {
      return "NEW SONG";
    }
  }
  else if(object_new.is_paused != object_old.is_paused){
    if (object_new.is_paused){
      return "PAUSE";
    }
    else {
      return "PLAY";
    }
  }
  else if(object_new.shuffle != object_old.shuffle){
    if (object_new.shuffle){
      return "SHUFFLE ON";
    }
    else {
      return "SHUFFLE OFF";
    }
  }
  else if(object_new.repeat_mode != object_old.repeat_mode){
    return "REPEAT MODE "+object_new.repeat_mode;
  }
  else if(object_new.next_tracks[0].id != object_old.next_tracks[0].id ||
          object_new.next_tracks[1].id != object_old.next_tracks[1].id){
    return "QUEUE CHANGED";
  }
  else if(object_new.duration != object_old.duration){
    return "DURATION CHANGED";
  }
  // else if(object_new.restrictions != object_old.restrictions){
  //   return "RESTRICTIONS CHANGED";
  // }
  else {
    if(Math.abs(object_old.position + (Date.now()-object_old.timestamp) - object_new.position)>200){
      console.log("MORE THAN 200ms");
      return "POSITION CHANGED";
    }
    else{
      return "NOTHING";
    }
  }
}



function changeDetails(state, prev_state){
  let current_state = stateToTrackObject(state);
  let previous_state = stateToTrackObject(prev_state);
  let change = diffTrackObjects(current_state, previous_state);
  return [change, current_state];
}


function onPlaybackChange(state){
  console.log(state);
  if(prev_state == null){
    prev_state = state;
  }
  let change = changeDetails(state, prev_state);
  prev_state = state;
  console.log(change);
  ws.send(JSON.stringify({"type": "change", "value": change}));
}

function addScript(src, callback, accessToken){
  let s = document.createElement('script');
  s.setAttribute('src', src);
  s.onload=callback(accessToken);
  document.body.appendChild(s);
}

function initPlayer(accessToken){
  window.onSpotifyWebPlaybackSDKReady = () => {
    let player = new Spotify.Player({
      name: 'Ledgendary',
      getOAuthToken: cb => { cb(accessToken); },
      volume: 0.5
    });

    player.addListener('initialization_error', ({ message }) => { console.error(message); });
    player.addListener('authentication_error', ({ message }) => { console.error(message); });
    player.addListener('account_error', ({ message }) => { console.error(message); });
    player.addListener('playback_error', ({ message }) => { console.error(message); });

    // Playback status updates:
    player.addListener('player_state_changed', state => { onPlaybackChange(state); });
    player.addListener('ready', ({ device_id }) => {
            console.log('Ready with Device ID', device_id);
    });
    player.addListener('not_ready', ({ device_id }) => {
            console.log('Device ID has gone offline', device_id);
    });
    player.connect();
  };
}

const refreshButton = document.getElementById("refresh");
const statusText = document.getElementById("status");
const LOCAL_STATIC_ADDRESS = window.location.host;

console.log(LOCAL_STATIC_ADDRESS);

refreshButton.addEventListener("click", () => {
  statusText.innerText = "...";
  ws.send(JSON.stringify({"type": "auth?"}));
});

statusText.innerText = "Not authorized";


const ws = new WebSocket(`ws://${LOCAL_STATIC_ADDRESS}`);
// Might use later
// ws.binaryType = "arraybuffer";


ws.onopen = () => {
  // Web Socket is connected, send data using send()
  ws.send(JSON.stringify({"type": "conn", "value": "Web browser"}));
  ws.send(JSON.stringify({"type": "auth?", "value": "no_response"}));
};


let accessToken;
let authOpened = false;

ws.onmessage = (evt) => {
  const received_msg = evt.data;
  const message_and_type = checkDataType(received_msg);
  const type = message_and_type["type"];
  const value = message_and_type["value"];

  console.log(
    "Received message type:", type,
    "value:", value
  );

  if ( type != "auth" ) {
    return;
  }

  // Might use later
  // const returnValue = value.returnValue;

  const already_authorized = value.already_authorized;

  if ( !already_authorized && !authOpened ) {
    console.log("FBI OPEN THE WINDOW!")
    statusText.innerText = "Not authorized - probably an error";

    authOpened = true;
    window.open(value.authorizeURL, '_blank');

  } else {
    console.log("NEW ACCESS TOKEN");
    statusText.innerText = "Authorized :)";
    accessToken = value.accessToken;
    if(already == false){
      console.log("SCRIPT!");
      addScript("https://sdk.scdn.co/spotify-player.js", initPlayer, accessToken);
      already = true;
    }
    authOpened = false;
  }
}
