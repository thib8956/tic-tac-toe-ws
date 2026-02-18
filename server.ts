import type { Message, Update, Hello, EndGame, Symbol, SymbolWithHue } from "common.js"
import { WebSocket, WebSocketServer, MessageEvent } from "ws";

const PORT = 1234;
const GRID_SIZE = 3;
const wss = new WebSocketServer({ port: PORT });

let grid = [0, 0, 0, 0, 0, 0, 0, 0, 0];
let hues = [0, 0, 0, 0, 0, 0, 0, 0, 0];
let endGame = false;

console.log(`waiting for connection on ws://localhost:${PORT}`);

interface Client {
    id: number,
    symbol: "x" | "o",
    ws: WebSocket
}

let id = 1;
let spectators: WebSocket[] = [];
let clients: Client[] = [];
let currentPlayer: Client | undefined = undefined;

function getPlayerSymbol(): Symbol {
    console.assert(clients.length < 2, "there should never be more than 2 clients");
    if (clients.length === 0) return "o";
    return clients[0].symbol === "o" ? "x" : "o";
}

wss.on("connection", (ws, req) => {
    id += 1;
    if (clients.length === 2) {
        spectators.push(ws);
        const spectateData: (SymbolWithHue | undefined)[] = [];
        for (const [i, playerId] of grid.entries()) {
            if (playerId === 0) {
                spectateData.push(undefined);
            } else {
                const client = clients.find(c => c.id === playerId);
                if (!client) {
                    spectateData.push(undefined);
                    continue;
                }
                const sym = client.symbol;
                const hue = hues[i];
                spectateData.push({ symbol: sym, hue: hue });
            }
        }
        const spectateMsg: Message = {
            kind: "spectate",
            data: { grid: spectateData }
        };
        ws.send(JSON.stringify(spectateMsg));
        const addr = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
        console.log(`new spectator connected with address ${addr}. total spectators ${spectators.length}`);
        return;
    }

    const symbol = getPlayerSymbol();
    const helloMsg: Message = {
        kind: "hello",
        data: { id, symbol } as Hello
    };
    clients.push({id, ws, symbol});
    ws.send(JSON.stringify(helloMsg));
    const addr = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
    console.log(`player #${id} connected with address ${addr}. total clients ${clients.length}`);

    ws.addEventListener("message", (event: MessageEvent) => {
        let message;
        try {
            message = JSON.parse(event.data as string);
        } catch {
            console.warn("received non-JSON message, ignoring");
            return;
        }
        const {x, y} = message;
        if (x < 0 || x >= GRID_SIZE || y < 0 || y >= GRID_SIZE) {
            console.warn("received invalid move, ignoring");
            return;
        }
        const hue = Math.floor(Math.random() * 361); // hue is a value in degrees
        const player = clients.find(x => x.ws === ws);
        if (!player) throw new Error("player not found");
        console.log("received message", message, "player", player!.id, "currentPlayer", currentPlayer?.id);

        if (!currentPlayer) {
            currentPlayer = player;
        }

        if (endGame) {
            console.log("player", currentPlayer!.id, "reset the game");
            // reset game state
            grid = [0, 0, 0, 0, 0, 0, 0, 0, 0];
            hues = [0, 0, 0, 0, 0, 0, 0, 0, 0];
            currentPlayer = undefined;
            endGame = false;
            for (const c of clients) {
                const m = JSON.stringify({
                    kind: "reset"
                } as Message);
                console.log("sent response", m, c.id);
                c.ws.send(m);
            }

            for (const s of spectators) {
                s.send(JSON.stringify({
                    kind: "reset"
                } as Message));
            }
        }

        if (clients.length < 2 || player.id !== currentPlayer?.id || endGame) {
            return;
        }

        if (grid[y * GRID_SIZE + x] === 0) {
            grid[y * GRID_SIZE + x] = player.id;
            hues[y*3+x] = hue;
            const msg = JSON.stringify({
                kind: "update",
                data: {
                    last: { x, y, symbol: player.symbol, hue: hue },
                } as Update,
            } as Message);

            for (const c of clients) {
                c.ws.send(msg);
            }

            for (const s of spectators) {
                s.send(msg);
            }

            const winnerId = checkWin(grid);
            if (winnerId == -1) {
                currentPlayer = clients.find(x => x.id !== currentPlayer?.id); // change player
                console.assert(currentPlayer);
                console.log(`current player is #${currentPlayer?.id}`);
            } else if (winnerId == 0) {
                endGame = true;
                const msg = JSON.stringify({
                    kind: "endgame",
                    data: { issue: "draw" } as EndGame
                } as Message);
                for (const c of clients) {
                    c.ws.send(msg);
                }
                for (const s of spectators) {
                    s.send(msg);
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
        spectators = spectators.filter(s => s.readyState !== WebSocket.CLOSED);
        const isClientDisconnect = clients.some(c => c.ws === ws);
        if (isClientDisconnect) {
            clients = clients.filter(x => x.ws.readyState !== WebSocket.CLOSED);
            console.log(`player disconnected. Resetting game. Total clients ${clients.length}`);
            // reset game state
            grid = [0, 0, 0, 0, 0, 0, 0, 0, 0];
            hues = [0, 0, 0, 0, 0, 0, 0, 0, 0];
            currentPlayer = undefined;
            endGame = false;
            for (const c of clients) {
                c.ws.send(JSON.stringify({
                    kind: "reset"
                } as Message));
            }
        }
    });
});

function checkWin(grid: number[]): number {
    const wins = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8], // ROWS
        [0, 3, 6], [1, 4, 7], [2, 5, 8], // COLS
        [0, 4, 8], [2, 4, 6]             // DIAGONALS
    ];
    for (const [a, b, c] of wins) {
        if (grid[a] !== 0 && grid[a] === grid[b] && grid[a] === grid[c]) {
            return grid[a];
        }
    }
    return grid.includes(0) ? -1 : 0;
}

