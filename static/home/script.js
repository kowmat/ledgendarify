function checkDataType(data){
  try{
    var json_data = JSON.parse(data);
    return json_data
  }
  catch(err){
    return {"type": "else", "value": data}
  }
}

var refreshButton = document.getElementById("refresh");
var statusText = document.getElementById("status");

refreshButton.addEventListener("click", function(){
  statusText.innerText = "...";
  ws.send(JSON.stringify({"type": "auth?"}));
});

statusText.innerText = "Not authorized";

var accessToken;
var LOCAL_STATIC_ADDRESS = window.location.host;
console.log(LOCAL_STATIC_ADDRESS);
var authOpened = false;

var ws = new WebSocket(`ws://${LOCAL_STATIC_ADDRESS}`);
// ws.binaryType = "arraybuffer";



ws.onopen = function() {
  // Web Socket is connected, send data using send()
  ws.send(JSON.stringify({"type": "conn", "value": "Web browser"}));
  ws.send(JSON.stringify({"type": "auth?", "value": "no_response"}));

};


ws.onmessage = (evt) => {
  var received_msg = evt.data;
  var message_and_type = checkDataType(received_msg);
  console.log("Received message type:", message_and_type["type"], " value:", message_and_type["value"]);
  if(message_and_type["type"] == "auth"){
    var already_authorized = message_and_type["value"].already_authorized;
    var returnValue = message_and_type["value"].returnValue;
    if(!already_authorized && !authOpened){
      console.log("FBI OPEN THE WINDOW!")
      statusText.innerText = "Not authorized - probably an error";
      authOpened = true;
      window.open(message_and_type["value"].authorizeURL, '_blank');
    }
    else{
      accessToken = message_and_type["value"].accessToken;
      console.log("NEW ACCESS TOKEN");
      statusText.innerText = "Authorized :)";
      authOpened = false;
    }
  }
}
