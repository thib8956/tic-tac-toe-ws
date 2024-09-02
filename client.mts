const ws = new WebSocket("ws://localhost:1234");

ws.onopen = (e) => {
    console.log("connected to server");
    ws.send("hello");
};

