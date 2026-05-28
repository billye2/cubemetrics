import { theme, RESET, FG, BOLD, DIM } from './colors';

export function progressBar(current: number, total: number, width: number = 30): string {
  const ratio = Math.min(1, Math.max(0, current / total));
  const filled = Math.round(ratio * width);
  const empty = width - filled;
  const pct = Math.round(ratio * 100);

  const bar = `${theme.highlight}${'█'.repeat(filled)}${DIM}${'░'.repeat(empty)}${RESET}`;
  return `${bar} ${BOLD}${pct}%${RESET}`;
}

export function streakDisplay(count: number): string {
  if (count === 0) return `${DIM}No streak${RESET}`;
  const color = count >= 7 ? FG.red : count >= 3 ? FG.yellow : FG.white;
  return `${color}${BOLD}${count} day streak!${RESET}`;
}
