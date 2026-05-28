import { RESET } from './colors';
import { currentCols } from './context';

const ANSI_REGEX = /\x1b\[[0-9;]*m/g;

export function stripAnsi(str: string): string {
  return str.replace(ANSI_REGEX, '');
}

export function visibleLength(str: string): number {
  return stripAnsi(str).length;
}

export function center(text: string, width: number = currentCols()): string {
  const vLen = visibleLength(text);
  if (vLen >= width) return text;
  const left = Math.floor((width - vLen) / 2);
  return ' '.repeat(left) + text;
}

export function padRight(text: string, width: number): string {
  const vLen = visibleLength(text);
  if (vLen >= width) return text;
  return text + ' '.repeat(width - vLen);
}

export function padLeft(text: string, width: number): string {
  const vLen = visibleLength(text);
  if (vLen >= width) return text;
  return ' '.repeat(width - vLen) + text;
}

export function truncate(text: string, maxLen: number, ellipsis: string = '...'): string {
  const stripped = stripAnsi(text);
  if (stripped.length <= maxLen) return text;
  return stripped.slice(0, maxLen - ellipsis.length) + ellipsis;
}

export function wordWrap(text: string, width: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    if (current.length + word.length + 1 > width) {
      if (current) lines.push(current);
      current = word;
    } else {
      current = current ? current + ' ' + word : word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

export function repeat(char: string, count: number): string {
  return char.repeat(Math.max(0, count));
}

export function colorize(text: string, ...codes: string[]): string {
  return codes.join('') + text + RESET;
}
