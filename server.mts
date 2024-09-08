import { Message, Response, Hello } from "common.mjs"
import { WebSocket, WebSocketServer } from "ws";

const port = 1234
const wss = new WebSocketServer({ port });

let grid = [0, 0, 0, 0, 0, 0, 0, 0, 0]

console.log(`waiting for connection on ws://localhost:${port}`);

interface Client {
    id: number,
    ws: WebSocket
}

let id = 1;
let clients: Client[] = [];

wss.on("connection", (ws) => {
    id += 1;
    if (clients.length == 2) {
        console.log("too many players");
        ws.close();
        return;
    }

    clients.push({id, ws});
    ws.send(JSON.stringify({kind: "hello", data: { id } as Hello}));
    console.log(`player #${id} connected`);

    ws.addEventListener("message", (event: any) => {
        const message = JSON.parse(event.data);
        const {x, y} = message;
        const playerId = clients.find(x => x.ws === ws)?.id;
        console.assert(playerId);
        if (grid[y*3+x] === 0) {
            grid[y*3+x] = playerId as number;
            for (const c of clients) {
                const msg: Message = {
                    kind: "update",
                    data: { grid } as Response,
                }
                c.ws.send(JSON.stringify(msg));
            }
        }
    });

    ws.on("close", () => {
        console.log(`player #${id} disconnected`);
        clients = clients.filter(x => x.id !== id);
    });
});
