export const COLS = 80;
export const ROWS = 25;

export const clear = () => '\x1b[2J\x1b[H';
export const goto = (row: number, col: number) => `\x1b[${row};${col}H`;
export const cursorHide = () => '\x1b[?25l';
export const cursorShow = () => '\x1b[?25h';
export const eraseLine = () => '\x1b[2K';
export const eraseToEnd = () => '\x1b[K';
export const scrollUp = (n: number = 1) => `\x1b[${n}S`;
export const scrollDown = (n: number = 1) => `\x1b[${n}T`;
export const newline = () => '\r\n';
