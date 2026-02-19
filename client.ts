import type { Click, Update, Message, Hello, EndGame, Spectate } from "common.js";

declare global {
    interface Window {
        TIC_TAC_TOE_CONFIG?: { WS_URL?: string };
    }
}

const ANIMATE_DURATION = 500;
const GRID_PADDING = 10;
const MESSAGE_PADDING = 20;

const address = window.TIC_TAC_TOE_CONFIG?.WS_URL || "ws://localhost:1234";
const ws = new WebSocket(address);

interface Point {
    x: number;
    y: number;
}

type Empty = undefined;

type Cell = Empty | Shape;

interface Shape {
    kind: "o" | "x";
    hue: number;
    time: number | null;
}

let grid: Cell[] = new Array(9);
let pendingEvts: Point[] = [];
let isSpectator = false;  // is this client in spectator mode?
let myId: number | null = null;
let mySymbol: "x" | "o" | null = null;
let animationId: number;
let canvasMsg: string = "Offline...";

function drawGridBackground(ctx: CanvasRenderingContext2D, origin: Point, cellSize: number, gridSize: number) {
    ctx.strokeStyle = "white";
    ctx.lineWidth = 5;

    for (let x = 1; x < 3; ++x) {
        ctx.moveTo(origin.x + x * cellSize, origin.y);
        ctx.lineTo(origin.x + x * cellSize, origin.y + gridSize);
    }

    for (let y = 1; y < 3; ++y) {
        ctx.moveTo(origin.x, origin.y + y * cellSize);
        ctx.lineTo(origin.x + gridSize, origin.y + y * cellSize);
    }

    ctx.stroke();
}

function resizeCanvas(ctx: CanvasRenderingContext2D) {
    ctx.canvas.width  = window.innerWidth;
    ctx.canvas.height = window.innerHeight;
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
}

function coordToGridIndex(origin: Point, clientPos: Point, cellSize: number): [number, number] | undefined {
    // Coord relative to origin of the grid (origin)
    const pt = { x: clientPos.x - origin.x, y: clientPos.y - origin.y };
    const gridIndex: [number, number] = [Math.floor(pt.x / cellSize), Math.floor(pt.y / cellSize)];
    if (gridIndex[0] >= 0 && gridIndex[0] <= 2 && gridIndex[1] >= 0 && gridIndex[1] <= 2) {
        return gridIndex;
    }
    return undefined;
}

function handlePendingEvts(ws: WebSocket, gridOrigin: Point, cellSize: number) {
    for (const evt of pendingEvts) {
        const gridIndex = coordToGridIndex(gridOrigin, evt, cellSize);
        if (gridIndex) {
            const [x, y] = gridIndex;
            const msg: Click = { x, y };
            ws.send(JSON.stringify(msg));
        }
    }
    pendingEvts = [];
}

function drawAnimatedCircle(ctx: CanvasRenderingContext2D, dt: number, x: number, y: number, hue: number, shapeSize: number) {
    const radius = shapeSize / 2;
    const end = dt*2*Math.PI/ANIMATE_DURATION;
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.min(end, 2*Math.PI));
    const percent = Math.floor(100*Math.min(end, 2*Math.PI)/(2*Math.PI));
    ctx.strokeStyle = `hsla(${hue}, ${percent}%, 50%, 1)`;
    ctx.lineWidth = 5;
    ctx.stroke();
    ctx.restore();
}

function drawAnimatedCross(ctx: CanvasRenderingContext2D, dt: number, x: number, y: number, hue: number, shapeSize: number) {
    const startPoint: Point = { x: x-shapeSize/2, y: y-shapeSize/2 };
    const halfAnim = ANIMATE_DURATION/2;

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(startPoint.x, startPoint.y);

    const delta = shapeSize*dt/halfAnim;
    if (delta < shapeSize) { // draw \
        const d = Math.min(delta, shapeSize);
        ctx.lineTo(startPoint.x + d, startPoint.y + d);
    } else { // draw /
        ctx.lineTo(startPoint.x + shapeSize, startPoint.y + shapeSize); // keep \ drawn
        ctx.moveTo(startPoint.x + shapeSize, startPoint.y);
        const d = Math.min(delta - shapeSize, shapeSize);
        ctx.lineTo(startPoint.x + shapeSize - d, startPoint.y + d);
    }

    ctx.lineWidth = 5;
    const percent = Math.floor(100*Math.min(delta, shapeSize)/shapeSize);
    ctx.strokeStyle = `hsla(${hue}, ${percent}%, 50%, 1)`;
    ctx.stroke();
    ctx.restore();
}

function gridIndexToCoords(gridOrigin: Point, x: number, y: number, cellSize: number): Point {
    const center = {
        x: gridOrigin.x + x * cellSize + cellSize/2,
        y: gridOrigin.y + y * cellSize + cellSize/2
    };
    return center;
}

function updateGridState(ctx: CanvasRenderingContext2D, time: number, gridOrigin: Point, cellSize: number) {
    const shapeSize = cellSize * 0.80;
    for (let y = 0; y < 3; ++y) {
        for (let x = 0; x < 3; ++x) {
            const shape = grid[y*3+x];
            if (shape) {
                if (shape.time === null) {
                    shape.time = time;
                }

                const p = gridIndexToCoords(gridOrigin, x, y, cellSize);
                const dt = time - shape.time;

                switch (shape.kind) {
                    case "o": {
                        drawAnimatedCircle(ctx, dt, p.x, p.y, shape.hue, shapeSize);
                        break;
                    }
                    case "x": {
                        drawAnimatedCross(ctx, dt, p.x, p.y, shape.hue, shapeSize);
                        break;
                    }
                    default: break;
                }
            }
        }
    }
}

// update loop, called every frame
function update(ctx: CanvasRenderingContext2D, time: number, ws: WebSocket) {
    const cellSize = Math.floor(Math.min(ctx.canvas.width, ctx.canvas.height - MESSAGE_PADDING * 2 - GRID_PADDING) / 3);
    const gridSize = cellSize * 3;
    
    const gridOrigin: Point = { 
        x: (ctx.canvas.width - gridSize) / 2,
        y: MESSAGE_PADDING + GRID_PADDING,
    };
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    ctx.fillStyle = "white";
    ctx.font = "24px sans-serif";
    ctx.fillText(canvasMsg, gridOrigin.x + MESSAGE_PADDING, MESSAGE_PADDING);

    drawGridBackground(ctx, gridOrigin, cellSize, gridSize);
    updateGridState(ctx, time, gridOrigin, cellSize);
    handlePendingEvts(ws, gridOrigin, cellSize);

    animationId = window.requestAnimationFrame(t => update(ctx, t, ws));
}

function init() {
    // canvas stuff
    const canvas = document.getElementById("game") as HTMLCanvasElement | null;
    if (!canvas) throw new Error("unable to get canvas HTML element");
    const ctx = canvas.getContext("2d") as CanvasRenderingContext2D | null;
    if (!ctx) throw new Error("unable to get canvas 2D context");
    resizeCanvas(ctx); // Init canvas

    canvas.addEventListener("click", (evt) => {
        if (isSpectator) {
            console.warn("ignoring click in spectator mode");
            return;
        }
        const {clientX, clientY} = evt;
        pendingEvts.push({x: clientX, y: clientY});
    });

    // websocket stuff
    ws.onopen = () => {
        console.log("connected to websocket server");
    };

    ws.onerror = () => {
        canvasMsg = "Connection error!";
    };

    ws.onclose = () => {
        canvasMsg = "Disconnected";
    };

    ws.onmessage = (evt) => {
        let msg: Message;
        try {
            msg = JSON.parse(evt.data);
        } catch {
            console.warn("received non-JSON message, ignoring");
            return;
        }
        console.log(msg);
        switch (msg.kind) {
            case "hello": {
                myId = (msg.data as Hello).id;
                mySymbol = (msg.data as Hello).symbol;
                canvasMsg = `connected to server with id ${myId}, ${mySymbol}`;
                console.log(canvasMsg);
                break;
            }
            case "spectate": {
                isSpectator = true;
                canvasMsg = "connected as spectator";
                // Initialize grid state
                for (const [index, sym] of (msg.data as Spectate).grid.entries()) {
                    if (!sym) continue;
                    grid[index] = {
                        kind: sym.symbol,
                        time: null,
                        hue: sym.hue,
                    } as Shape;
                }
                break;
            }
            case "update": {
                const res = msg.data as Update;
                const { x, y } = res.last;
                const shape: Shape = {
                    kind: res.last.symbol,
                    hue: res.last.hue,
                    time: null,
                };
                grid[y*3+x] = shape;
                console.log(grid);
                break;
            }
            case "endgame": {
                const issue = (msg.data as EndGame).issue;
                switch (issue) {
                    case "win": canvasMsg = "You won!"; break;
                    case "lose": canvasMsg = "You lose!"; break;
                    case "draw": canvasMsg = "It's a draw!"; break;
                    default: throw new Error(`unexpected ${issue}`);
                }
                canvasMsg += " Click to reset";
                break;
            }
            case "reset": {
                if (!isSpectator) {
                    canvasMsg = `Game reset... Id #${myId}, playing as ${mySymbol}`;
                }
                grid = new Array(9); // reset grid state
                pendingEvts = []; // reset pending events
                resizeCanvas(ctx); // hack to avoid race condition on game reset
                break;
            }
            default: {
                console.warn("unhandled message kind:", msg.kind);
                break;
            }
        }
    };

    window.addEventListener('resize', () => resizeCanvas(ctx));
    window.requestAnimationFrame(t => update(ctx, t, ws));
    window.addEventListener('beforeunload', () => cancelAnimationFrame(animationId));
}

init();
