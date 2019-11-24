
function checkDataType(data){
  try {
    const json_data = JSON.parse(data);
    return json_data;
  }
  catch(err) {
    return {"type": "else", "value": data};
  }
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
    authOpened = false;
  }
}
