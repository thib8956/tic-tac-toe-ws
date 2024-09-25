export type MessageKind = "hello" | "update" | "endgame" | "reset";

export interface Message {
    kind: MessageKind,
    data: Response | Hello | EndGame | Reset,
}

export interface Request {
    x: number,
    y: number
}

export interface Response {
    last: { x: number, y: number, symbol: "x" | "o" }
}

export interface Hello {
    id: number,
    symbol: "x" | "o"
}

export interface EndGame {
    issue: "win" | "lose" | "draw"
}

type Reset = undefined;

