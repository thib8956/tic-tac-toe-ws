import { Request, Response, Message, Hello, EndGame } from "common.js";

const CELL_SIZE = 150;
const GRID_SIZE = CELL_SIZE * 3;
const SHAPE_SIZE = 100;
const ANIMATE_DURATION = 500; // ms

let address = "ws://localhost:1234";
if (window.location.hostname !== "localhost") {
    address = "wss://tic-tac-toe-ws-production.up.railway.app";
}
const ws = new WebSocket(address);

interface Point {
    x: number;
    y: number;
}

type Empty = undefined;

type Cell = Empty | Shape;

interface Shape {
    kind: "o" | "x";
    pos: Point;
    hue: number;
    time: number | null;
}

let grid: Cell[] = new Array(9);
let pendingEvts: Point[] = [];
let myId: number | null = null;
let mySymbol: "x" | "o" | null = null;
let canvasMsg: string = "Offline";

function drawGridBackground(ctx: CanvasRenderingContext2D, origin: Point) {
    ctx.strokeStyle = "white";
    ctx.lineWidth = 5;

    for (let x = 1; x < 3; ++x) {
        ctx.moveTo(origin.x + x * CELL_SIZE, 0 + origin.y);
        ctx.lineTo(origin.x + x * CELL_SIZE, origin.y + GRID_SIZE);
    }

    for (let y = 1; y < 3; ++y) {
        ctx.moveTo(origin.x + 0, origin.y + y * CELL_SIZE);
        ctx.lineTo(origin.x + GRID_SIZE, origin.y + y * CELL_SIZE);
    }

    ctx.stroke();
}


function resizeCanvas(ctx: CanvasRenderingContext2D) {
    ctx.canvas.width  = window.innerWidth;
    ctx.canvas.height = window.innerHeight;
}


function coordToGridIndex(origin: Point, clientPos: Point): [number, number] | undefined {
    // Coord relative to origin of the grid (origin)
    const pt = { x: clientPos.x - origin.x, y: clientPos.y - origin.y };
    const gridIndex: [number, number] = [Math.floor(3 * pt.x / GRID_SIZE), Math.floor(3 * pt.y / GRID_SIZE)];
    if (gridIndex[0] >= 0 && gridIndex[0] <= 2 && gridIndex[1] >= 0 && gridIndex[1] <= 2) {
        return gridIndex;
    }
    return undefined;
}

function handlePendingEvts(ws: WebSocket, gridOrigin: Point) {
    for (const evt of pendingEvts) {
        const gridIndex = coordToGridIndex(gridOrigin, evt);
        if (gridIndex) {
            const [x, y] = gridIndex;
            const msg: Request = { x, y };
            ws.send(JSON.stringify(msg));
        }
    }
    pendingEvts = [];
}

function drawAnimatedCircle(ctx: CanvasRenderingContext2D, dt: number, x: number, y: number, hue: number) {
    const radius = SHAPE_SIZE / 2;
    const end = dt*2*Math.PI/ANIMATE_DURATION;
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.min(end, 2*Math.PI));
    const percent = Math.trunc(100*Math.min(end, 2*Math.PI)/(2*Math.PI));
    ctx.strokeStyle = `hsla(${hue}, ${percent}%, 50%, 1)`;
    ctx.lineWidth = 5;
    ctx.stroke();
    ctx.restore();
}

function drawAnimatedCross(ctx: CanvasRenderingContext2D, dt: number, x: number, y: number, hue: number) {
    const startPoint: Point = { x: x-SHAPE_SIZE/2, y: y-SHAPE_SIZE/2 };
    const halfAnim = ANIMATE_DURATION/2;

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(startPoint.x, startPoint.y);

    const delta = SHAPE_SIZE*dt/halfAnim;
    if (delta < SHAPE_SIZE) { // draw \
        const d = Math.min(delta, SHAPE_SIZE);
        ctx.lineTo(startPoint.x + d, startPoint.y + d);
    } else { // draw /
        ctx.lineTo(startPoint.x + SHAPE_SIZE, startPoint.y + SHAPE_SIZE); // keep \ drawn
        ctx.moveTo(startPoint.x + SHAPE_SIZE, startPoint.y);
        const d = Math.min(delta - SHAPE_SIZE, SHAPE_SIZE);
        ctx.lineTo(startPoint.x + SHAPE_SIZE - d, startPoint.y + d);
    }

    ctx.lineWidth = 5;
    const percent = Math.trunc(100*Math.min(delta, SHAPE_SIZE)/SHAPE_SIZE);
    ctx.strokeStyle = `hsla(${hue}, ${percent}%, 50%, 1)`;
    ctx.stroke();
    ctx.restore();
}

function gridIndexToCoords(gridOrigin: Point, x: number, y: number): Point {
    const center = {
        x: gridOrigin.x + x * CELL_SIZE + CELL_SIZE/2,
        y: gridOrigin.y + y * CELL_SIZE + CELL_SIZE/2
    };
    return center;
}

function updateGridState(ctx: CanvasRenderingContext2D, time: number, gridOrigin: Point) {
    for (let y = 0; y < 3; ++y) {
        for (let x = 0; x < 3; ++x) {
            const shape = grid[y*3+x]
            if (shape) {
                if (shape.time === null) {
                    shape.time = time;
                }

                const p = gridIndexToCoords(gridOrigin, shape.pos.x, shape.pos.y);
                const dt = time - shape.time;

                switch (shape.kind) {
                    case "o": {
                        drawAnimatedCircle(ctx, dt, p.x, p.y, shape.hue);
                        break;
                    }
                    case "x": {
                        drawAnimatedCross(ctx, dt, p.x, p.y, shape.hue);
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
    const gridOrigin: Point = { 
        x: ctx.canvas.width / 2 - GRID_SIZE / 2,
        y: ctx.canvas.height / 2 - GRID_SIZE / 2
    };
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    ctx.fillStyle = "white";
    ctx.font = "24px sans-serif";
    ctx.fillText(canvasMsg, 10, 30);

    drawGridBackground(ctx, gridOrigin);
    handlePendingEvts(ws, gridOrigin);
    updateGridState(ctx, time, gridOrigin);

    window.requestAnimationFrame(t => update(ctx, t, ws));
}

function init() {
    // canvas stuff
    const canvas = document.getElementById("game") as HTMLCanvasElement | null;
    if (!canvas) throw new Error("unable to get canvas HTML element");
    const ctx = canvas.getContext("2d") as CanvasRenderingContext2D | null;
    if (!ctx) throw new Error("unable to get canvas 2D context");
    resizeCanvas(ctx); // Init canvas

    canvas.addEventListener("click", (evt) => {
        const {clientX, clientY} = evt;
        pendingEvts.push({x: clientX, y: clientY});
    });

    // websocket stuff
    ws.onopen = (e) => {
        console.log("connected to websocket");
    };

    ws.onmessage = (evt) => {
        const msg: Message = JSON.parse(evt.data);
        console.log(msg);
        switch (msg.kind) {
            case "hello": {
                myId = (msg.data as Hello).id;
                mySymbol = (msg.data as Hello).symbol;
                canvasMsg = `connected to server with id ${myId}, ${mySymbol}`;
                console.log(canvasMsg);
                break;
            }
            case "update": {
                const res = msg.data as Response;
                const { x, y } = res.last;
                const shape: Shape = {
                    kind: res.last.symbol,
                    pos: { x,  y },
                    hue: Math.floor(Math.random() * 255),
                    time: null,
                };
                grid[y*3+x] = shape;
                console.log(grid);
                break;
            }
            case "endgame": {
                const issue = (msg.data as EndGame).issue;
                switch (issue) {
                    case "win": canvasMsg = "you won"; break;
                    case "lose": canvasMsg = "you lose"; break;
                    case "draw": canvasMsg = "it's a draw!"; break;
                    default: throw new Error(`unexpected ${issue}`);
                }
                break;
            }
            case "reset": {
                canvasMsg = `Game reset... Id #${myId}, playing as ${mySymbol}`;
                grid = new Array(9);
                pendingEvts = [];
                break;
            }
            default: {
                console.warn("unhandled message kind:", msg.kind);
                break;
            }
        }
    };

    //window.addEventListener('resize', () => resizeCanvas(ctx));
    window.requestAnimationFrame(t => update(ctx, t, ws));
}

init();
