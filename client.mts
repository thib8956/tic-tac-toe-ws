import { Request, Response, Message } from "common.mjs";

const ws = new WebSocket("ws://localhost:1234");
const grid = [0, 0, 0, 0, 0, 0, 0, 0, 0]
const canvas = document.getElementById("game") as HTMLCanvasElement | null;
const ctx = canvas?.getContext("2d") as CanvasRenderingContext2D | null;

ws.onopen = (e) => {
    console.log("connected to server");
    if (canvas) {
        if (ctx) {
            drawGrid(ctx, grid);
            canvas.addEventListener("click", (evt: any) => {
                const {clientX, clientY} = evt;
                const x = Math.floor(clientX / 90);
                const y = Math.floor(clientY / 90);
                if (x < 3 && y < 3) {
                    const msg: Request = { x, y };
                    ws.send(JSON.stringify(msg));
                }
            });
        }
    }
};

ws.onmessage = (evt) => {
    const msg: Message = JSON.parse(evt.data);
    if (ctx && msg.kind == "update") {
        drawGrid(ctx, (msg.data as Response).grid);
    }
    else {
        console.log(msg);
    }
};


function drawGrid(ctx: CanvasRenderingContext2D, grid: number[]){
    for (let y = 0; y < 3; ++y) {
        for (let x = 0; x < 3; ++x) {
            if (grid[y*3+x] == 0) {
                ctx.fillStyle = "black";
                const rx = x + x * 100;
                const ry = y + y * 100;
                ctx.fillRect(rx, ry, 90, 90);
            } else if (grid[y*3+x] == 1) {
                ctx.fillStyle = "green";
                const rx = x + x * 100;
                const ry = y + y * 100;
                ctx.fillRect(rx, ry, 90, 90);
            } else if (grid[y*3+x] == 2) {
                ctx.fillStyle = "blue";
                const rx = x + x * 100;
                const ry = y + y * 100;
                ctx.fillRect(rx, ry, 90, 90);
            }
        }
    }
}

