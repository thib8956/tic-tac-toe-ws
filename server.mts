import { WebSocketServer } from "ws";

const port = 1234
const wss = new WebSocketServer({ port });

console.log(`waiting for connection on ws://localhost:${port}`);

wss.on("connection", (ws, req) => {
    console.log(`${req.socket.remoteAddress} connected`);

    ws.addEventListener("message", (event: any) => {
        //const message = JSON.parse(event.data.toString());
        const message = event.data.toString();
        console.log(`message from client : ${message}`);
    });
});


