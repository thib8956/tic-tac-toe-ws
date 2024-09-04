import { Message, Response } from "common.mjs"
import { WebSocket, WebSocketServer } from "ws";

const port = 1234
const wss = new WebSocketServer({ port });

let grid = [0, 0, 0, 0, 0, 0, 0, 0, 0]

console.log(`waiting for connection on ws://localhost:${port}`);

let id = -1;
let clients: WebSocket[] = [];

wss.on("connection", (ws) => {
    id += 1;
    if (id > 1) {
        throw new Error("too many players");
    }

    clients.push(ws);
    ws.send(JSON.stringify({kind: "hello", data: `player #${id} connected`} as any));
    console.log(`player #${id} connected`);

    ws.addEventListener("message", (event: any) => {
        const message = JSON.parse(event.data);
        const {x, y} = message;
        const playerId = clients.indexOf(ws);
        grid[y*3+x] = playerId + 1;
        for (const c of clients) {
            const msg: Message = {
                kind: "update",
                data: { grid } as Response,
            }
            c.send(JSON.stringify(msg));
        }
    });
});
