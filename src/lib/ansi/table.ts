import { theme, RESET } from './colors';
import { padRight, truncate, visibleLength } from './text';

interface TableOptions {
  headers: string[];
  rows: string[][];
  colWidths: number[];
  borderColor?: string;
}

export function table(options: TableOptions): string {
  const { headers, rows, colWidths, borderColor = theme.border } = options;
  const r = RESET;

  const formatRow = (cells: string[], color: string = ''): string => {
    return cells
      .map((cell, i) => {
        const truncated = truncate(cell, colWidths[i]);
        return `${color}${padRight(truncated, colWidths[i])}${r}`;
      })
      .join(` ${borderColor}│${r} `);
  };

  const separator = colWidths
    .map(w => '─'.repeat(w))
    .join(`─${borderColor}┼${r}─`);

  const lines: string[] = [];
  lines.push(formatRow(headers, theme.title));
  lines.push(`${borderColor}${separator}${r}`);
  for (const row of rows) {
    lines.push(formatRow(row));
  }

  return lines.join('\r\n');
}
