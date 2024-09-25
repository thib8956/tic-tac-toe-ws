import { Message, Response, Hello, EndGame } from "common.mjs"
import { WebSocket, WebSocketServer, MessageEvent } from "ws";

const port = 1234
const wss = new WebSocketServer({ port });

let grid = [0, 0, 0, 0, 0, 0, 0, 0, 0]
let endGame = false;

console.log(`waiting for connection on ws://localhost:${port}`);

interface Client {
    id: number,
    symbol: "x" | "o",
    ws: WebSocket
}

let id = 1;
let clients: Client[] = [];
let currentPlayer: Client | undefined = undefined;

wss.on("connection", (ws) => {
    id += 1;
    if (clients.length == 2) {
        console.log("too many players");
        ws.close();
        return;
    }

    const symbol = clients.length == 0 ? "o" : "x";
    const helloMsg: Message = {
        kind: "hello",
        data: { id, symbol } as Hello
    }
    clients.push({id, ws, symbol});
    ws.send(JSON.stringify(helloMsg));
    console.log(`player #${id} connected`);

    ws.addEventListener("message", (event: MessageEvent) => {
        const message = JSON.parse(event.data as string);
        const {x, y} = message;
        const player = clients.find(x => x.ws === ws);
        if (!player) throw new Error("player not found");
        console.log(message, player!.id, currentPlayer?.id);

        if (!currentPlayer) {
            currentPlayer = player;
        }

        if (clients.length < 2 || player.id != currentPlayer?.id || endGame) {
            return;
        }

        if (grid[y*3+x] === 0) {
            grid[y*3+x] = player.id;
            for (const c of clients) {
                const msg: Message = {
                    kind: "update",
                    data: {
                        grid,
                        last: { x, y, symbol: player.symbol }
                    } as Response,
                }
                c.ws.send(JSON.stringify(msg));
            }

            const winnerId = checkWin(grid);
            if (winnerId == -1) {
                currentPlayer = clients.find(x => x.id !== currentPlayer?.id); // change player
                console.assert(currentPlayer);
                console.log(`current player is #${currentPlayer?.id}`);
            } else if (winnerId == 0) {
                for (const c of clients) {
                    const msg: Message = {
                        kind: "endgame",
                        data: { issue: "draw" } as EndGame
                    };
                    c.ws.send(JSON.stringify(msg));
                    endGame = true;
                }
            } else {
                console.log(`player ${winnerId} won !`);

                const winner = clients.find(x => x.id === winnerId);
                winner?.ws?.send(JSON.stringify({
                    kind: "endgame",
                    data: { issue: "win" } as EndGame
                } as Message));

                const loser = clients.find(x => x.id !== winnerId);
                loser?.ws?.send(JSON.stringify({
                    kind: "endgame",
                    data: { issue: "lose" } as EndGame
                } as Message));
		endGame = true;
            }
        }
    });

    ws.on("close", () => {
        console.log(`player #${id} disconnected`);
        clients = clients.filter(x => x.id !== id);
    });
});

function checkWin(grid: number[]): number {
    const clone = [...grid];
    const grid2d = [];
    while(clone.length) grid2d.push(clone.splice(0,3));

    if (
        grid2d[0][0] !== 0 &&
        grid2d[0][0] === grid2d[0][1] &&
        grid2d[0][1] === grid2d[0][2]
    ) {
        return grid2d[0][0];
    }
    if (
        grid2d[1][0] !== 0 &&
        grid2d[1][0] === grid2d[1][1] &&
        grid2d[1][1] === grid2d[1][2]
    ) {
        return grid2d[1][0];
    }
    if (
        grid2d[2][0] !== 0 &&
        grid2d[2][0] === grid2d[2][1] &&
        grid2d[2][1] === grid2d[2][2]
    ) {
        return grid2d[2][0];
    }
    if (
        grid2d[0][0] !== 0 &&
        grid2d[0][0] === grid2d[1][0] &&
        grid2d[1][0] === grid2d[2][0]
    ) {
        return grid2d[0][0];
    }
    if (
        grid2d[0][1] !== 0 &&
        grid2d[0][1] === grid2d[1][1] &&
        grid2d[1][1] === grid2d[2][1]
    ) {
        return grid2d[0][1];
    }
    if (
        grid2d[0][2] !== 0 &&
        grid2d[0][2] === grid2d[1][2] &&
        grid2d[1][2] === grid2d[2][2]
    ) {
        return grid2d[0][2];
    }
    if (
        grid2d[0][0] !== 0 &&
        grid2d[0][0] === grid2d[1][1] &&
        grid2d[1][1] === grid2d[2][2]
    ) {
        return grid2d[0][0];
    }
    if (
        grid2d[0][2] !== 0 &&
        grid2d[0][2] === grid2d[1][1] &&
        grid2d[1][1] === grid2d[2][0]
    ) {
        return grid2d[0][2];
    }
    for (const row of grid2d) {
        if (row[0] === 0 || row[1] === 0 || row[2] === 0) {
            return -1;
        }
    }
    return 0;
}
