export type Message =
  | { kind: "click", data: Click }
  | { kind: "hello", data: Hello }
  | { kind: "update", data: Update }
  | { kind: "endgame", data: EndGame }
  | { kind: "reset", data: Reset }
  | { kind: "spectate", data: Spectate };

export interface Click {
    x: number,
    y: number
}

export type Symbol = "x" | "o";

export type SymbolWithHue = { symbol: Symbol, hue: number };

export interface Update {
    last: { x: number, y: number, symbol: Symbol, hue: number}
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
    grid: (SymbolWithHue | undefined)[]
}

