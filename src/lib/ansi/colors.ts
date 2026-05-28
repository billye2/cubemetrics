export const FG = {
  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
} as const;

export const BG = {
  black: '\x1b[40m',
  red: '\x1b[41m',
  green: '\x1b[42m',
  yellow: '\x1b[43m',
  blue: '\x1b[44m',
  magenta: '\x1b[45m',
  cyan: '\x1b[46m',
  white: '\x1b[47m',
} as const;

export const RESET = '\x1b[0m';
export const BOLD = '\x1b[1m';
export const DIM = '\x1b[2m';
export const UNDERLINE = '\x1b[4m';
export const REVERSE = '\x1b[7m';

export const theme = {
  border: FG.cyan,
  title: BOLD + FG.yellow,
  menuKey: BOLD + FG.white,
  menuLabel: FG.cyan,
  highlight: BOLD + FG.green,
  error: BOLD + FG.red,
  dim: DIM + FG.white,
  prompt: BOLD + FG.yellow,
  sysop: BOLD + FG.magenta,
  success: BOLD + FG.green,
  info: FG.cyan,
  warning: BOLD + FG.yellow,
};
