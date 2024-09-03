const ws = new WebSocket("ws://localhost:1234");

ws.onopen = (e) => {
	console.log("connected to server");

	const canvas = document.getElementById("game") as HTMLCanvasElement | null;

	if (canvas) {
		const ctx = canvas.getContext("2d") as CanvasRenderingContext2D | null;
		if (ctx) {
			drawGrid(ctx);

			canvas.addEventListener("click", (evt: any) => {
				const {clientX, clientY} = evt;
				const x = Math.floor(clientX / 90);
				const y = Math.floor(clientY / 90);
				if (x < 3 && y < 3) {
					const rx = x + x * 100;
					const ry = y + y * 100;
					ctx.fillStyle = "red";
					ctx.fillRect(rx, ry, 90, 90);
					
					ws.send(JSON.stringify({x, y}));
				}
			});
		}
	}
};

ws.onmessage = (evt) => {
	console.log(evt.data);
};


function drawGrid(ctx: CanvasRenderingContext2D){
	for (let y = 0; y < 3; ++y) {
		for (let x = 0; x < 3; ++x) {
			ctx.fillStyle = "green";
			const rx = x + x * 100;
			const ry = y + y * 100;
			ctx.fillRect(rx, ry, 90, 90);
		}
	}
}

