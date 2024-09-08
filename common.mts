export type MessageKind = "hello" | "update";

export interface Message {
	kind: MessageKind,
	data: Response | Hello,
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

