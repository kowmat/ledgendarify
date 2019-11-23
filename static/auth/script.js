function checkDataType(data){
  try{
    var json_data = JSON.parse(data);
    return json_data
  }
  catch(err){
    return {"type": "else", "value": data}
  }
}

var LOCAL_STATIC_ADDRESS = window.location.host;
var ws = new WebSocket(`ws://${LOCAL_STATIC_ADDRESS}`);


ws.onmessage = (evt) => {
  var received_msg = evt.data;
  var message_and_type = checkDataType(received_msg);
  console.log("Received message type:", message_and_type["type"], " value:", message_and_type["value"]);
  if(message_and_type["type"] == "auth"){
    if(message_and_type["value"].already_authorized){
      window.close();
    }
  }
}

ws.onopen = function() {
  // Web Socket is connected, send data using send()
  ws.send(JSON.stringify({"type": "auth?", "value": "a"}));
};
