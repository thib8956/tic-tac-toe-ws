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
    grid: number[],
    last: { x: number, y: number, symbol: "x" | "o" }
}

export interface Hello {
    id: number,
    symbol: "x" | "o"
}

export interface EndGame {
    issue: "win" | "lose" | "draw"
}
