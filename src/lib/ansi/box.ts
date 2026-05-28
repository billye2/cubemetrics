import { RESET } from './colors';
import { COLS } from './screen';
import { padRight, visibleLength } from './text';

const STYLES = {
  single: { tl: '┌', tr: '┐', bl: '└', br: '┘', h: '─', v: '│', lt: '├', rt: '┤' },
  double: { tl: '╔', tr: '╗', bl: '╚', br: '╝', h: '═', v: '║', lt: '╠', rt: '╣' },
  heavy:  { tl: '┏', tr: '┓', bl: '┗', br: '┛', h: '━', v: '┃', lt: '┣', rt: '┫' },
} as const;

type BoxStyle = keyof typeof STYLES;

interface BoxOptions {
  style?: BoxStyle;
  width?: number;
  borderColor?: string;
  title?: string;
  titleColor?: string;
  padding?: number;
}

export function box(content: string[], options: BoxOptions = {}): string {
  const {
    style = 'double',
    width = COLS,
    borderColor = '',
    title,
    titleColor = '',
    padding = 1,
  } = options;

  const chars = STYLES[style];
  const bc = borderColor;
  const r = borderColor ? RESET : '';
  const innerWidth = width - 2;

  const lines: string[] = [];

  // Top border
  if (title) {
    const tc = titleColor || borderColor;
    const tr = titleColor ? RESET : r;
    const titleStr = ` ${tc}${title}${tr}${bc} `;
    const titleVisLen = visibleLength(titleStr);
    const remaining = innerWidth - titleVisLen;
    const leftLen = 2;
    const rightLen = remaining - leftLen;
    lines.push(
      `${bc}${chars.tl}${chars.h.repeat(leftLen)}${r}${titleStr}${bc}${chars.h.repeat(Math.max(0, rightLen))}${chars.tr}${r}`
    );
  } else {
    lines.push(`${bc}${chars.tl}${chars.h.repeat(innerWidth)}${chars.tr}${r}`);
  }

  // Content lines
  for (const line of content) {
    const pad = ' '.repeat(padding);
    const padded = pad + line;
    lines.push(`${bc}${chars.v}${r}${padRight(padded, innerWidth)}${bc}${chars.v}${r}`);
  }

  // Bottom border
  lines.push(`${bc}${chars.bl}${chars.h.repeat(innerWidth)}${chars.br}${r}`);

  return lines.join('\r\n');
}

export function divider(options: { style?: BoxStyle; width?: number; borderColor?: string } = {}): string {
  const { style = 'double', width = COLS, borderColor = '' } = options;
  const chars = STYLES[style];
  const r = borderColor ? RESET : '';
  return `${borderColor}${chars.lt}${chars.h.repeat(width - 2)}${chars.rt}${r}`;
}

export function horizontalLine(options: { style?: BoxStyle; width?: number; color?: string } = {}): string {
  const { style = 'single', width = COLS, color = '' } = options;
  const chars = STYLES[style];
  const r = color ? RESET : '';
  return `${color}${chars.h.repeat(width)}${r}`;
}
