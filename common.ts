export type MessageKind = "click" | "hello" | "update" | "endgame" | "reset" | "spectate";

export interface Message {
    kind: MessageKind,
    data: Click | Update | Hello | EndGame | Reset | Spectate,
}

export interface Click {
    x: number,
    y: number
}

export type Symbol = "x" | "o";

export interface Update {
    last: { x: number, y: number, symbol: Symbol }
}

export interface Hello {
    id: number,
    symbol: "x" | "o"
}

export interface EndGame {
    issue: "win" | "lose" | "draw"
}

type Reset = undefined;


export interface Spectate {
    grid: (Symbol | undefined)[]
}

