import { Request, Response, Message, Hello, EndGame } from "common.mjs";

const ws = new WebSocket("ws://localhost:1234");
const grid = [0, 0, 0, 0, 0, 0, 0, 0, 0]
const canvas = document.getElementById("game") as HTMLCanvasElement | null;
const ctx = canvas?.getContext("2d") as CanvasRenderingContext2D | null;

let myId: number | null = null;

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
    console.log(msg);
    switch (msg.kind) {
        case "hello": {
            myId = (msg.data as Hello).id;
            const h1 = document.getElementById("title") as HTMLHeadingElement | null;
            if (h1) {
                h1.innerText = `connected to server with id ${myId}`
            }
            break;
        }
        case "update": {
            if (ctx) {
                drawGrid(ctx, (msg.data as Response).grid);
            }
            break;
        }
	case "endgame": {
            const h1 = document.getElementById("title") as HTMLHeadingElement | null;
            if (h1) {
		const issue = (msg.data as EndGame).issue;
		switch (issue){
	            case "win": h1.innerText = "you won"; break;
		    case "lose": h1.innerText = "you lose"; break;
		    case "draw": h1.innerText = "it's a draw!"; break;
		    default: throw new Error(`unexpected ${issue}`);
		}
	    }
	    break;
	}
        default: {
            console.log(msg);
            break;
        }
    }
};


function drawGrid(ctx: CanvasRenderingContext2D, grid: number[]){
    for (let y = 0; y < 3; ++y) {
        for (let x = 0; x < 3; ++x) {
            switch (grid[y*3+x]) {
                case 0: ctx.fillStyle = "black"; break;
                case myId: ctx.fillStyle = "green"; break;
                default: ctx.fillStyle = "blue"; break;
            }

            const rx = x + x * 100;
            const ry = y + y * 100;
            ctx.fillRect(rx, ry, 90, 90);
        }
    }
}

