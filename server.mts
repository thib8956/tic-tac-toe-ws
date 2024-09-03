import { WebSocketServer } from "ws";

const port = 1234
const wss = new WebSocketServer({ port });

console.log(`waiting for connection on ws://localhost:${port}`);

let id = -1;
let clients = [];

wss.on("connection", (ws, req) => {
	id += 1;
	if (id > 1) {
		throw new Error("too many players");
	}

	clients.push(ws);
	ws.send("bonjour" + id);
	console.log(`player #${id} connected`);

    ws.addEventListener("message", (event: any) => {
        const message = event.data.toString();
        console.log(`message from client : ${message}`);
		if (id == 0) {
			clients[1].send("coucou");
		} else {
			clients[0].send("coucou");
		}
    });
});


