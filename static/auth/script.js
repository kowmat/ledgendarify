
function checkDataType(data) {
  try {
    const json_data = JSON.parse(data);
    return json_data;
  }
  catch(err) {
    return {"type": "else", "value": data};
  }
}


const LOCAL_STATIC_ADDRESS = window.location.host;
const ws = new WebSocket(`ws://${LOCAL_STATIC_ADDRESS}`);

ws.onmessage = (evt) => {
  const received_msg = evt.data;
  const message_and_type = checkDataType(received_msg);

  console.log(
    "Received message type:", message_and_type["type"],
    "value:", message_and_type["value"]
  );

  if (
    message_and_type["type"] == "auth" &&
    message_and_type["value"].already_authorized
  ) {
    window.close();
  }
}

ws.onopen = () => {
  // Web Socket is connected, send data using send()
  ws.send(JSON.stringify({"type": "auth?", "value": "a"}));
};
