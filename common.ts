export type MessageKind = "click" | "hello" | "update" | "endgame" | "reset";

export interface Message {
    kind: MessageKind,
    data: Click | Update | Hello | EndGame | Reset,
}

export interface Click {
    x: number,
    y: number
}

export interface Update {
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

