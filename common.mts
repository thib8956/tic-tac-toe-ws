export type MessageKind = "hello" | "update" | "endgame";

export interface Message {
	kind: MessageKind,
	data: Response | Hello | EndGame,
}

export interface Request {
	x: number,
	y: number
}

export interface Response {
	grid: number[]
}

export interface Hello {
    id: number
}

export interface EndGame {
    issue: "win" | "lose" | "draw"
}
