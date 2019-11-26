
function checkDataType(data){
  try {
    const json_data = JSON.parse(data);
    return json_data;
  }
  catch(err) {
    return {"type": "else", "value": data};
  }
}

var already = false;
let prev_state;

function stateToTrackObject(state){
  let info = new Object;
  info.duration = state.duration;
  info.isPaused = state.paused;
  info.position = state.position;
  info.repeat_mode = state.repeat_mode;
  info.restrictions = state.restrictions;
  info.shuffle = state.shuffle;
  info.timestamp = state.timestamp;
  info.currentTrack = {id: state.track_window.current_track.id,
                      name: state.track_window.current_track.name,
                      duration: state.track_window.current_track.duration_ms
                      };
  info.nextTracks = [];
  info.nextTracks[0] = {id: state.track_window.next_tracks[0].id,
                      name: state.track_window.next_tracks[0].name,
                      duration: state.track_window.next_tracks[0].duration_ms
                      };
  info.nextTracks[1] = {id: state.track_window.next_tracks[1].id,
                      name: state.track_window.next_tracks[1].name,
                      duration: state.track_window.next_tracks[1].duration_ms
                      };
  return info;
}


function changeDetails(state, prev_state){
  let current_state = stateToTrackObject(state);
  let previous_state = stateToTrackObject(prev_state);
  console.log(current_state);
}


function onPlaybackChange(state){
  prev_state = state;
  changeDetails(state, prev_state);
}

function addScript(src, callback, accessToken){
  let s = document.createElement('script');
  s.setAttribute('src', src);
  s.onload=callback(accessToken);
  document.body.appendChild(s);
}

function initPlayer(accessToken){
  window.onSpotifyWebPlaybackSDKReady = () => {
    var player = new Spotify.Player({
      name: 'Ledgendary',
      getOAuthToken: cb => { cb(accessToken); }
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
