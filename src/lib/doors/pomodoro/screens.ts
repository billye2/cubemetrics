import { clear } from '../../ansi/screen';
import { theme, RESET, BOLD, DIM, FG } from '../../ansi/colors';
import { menu } from '../../ansi/menu';
import { sectionHeader } from '../../ansi/header';
import { center } from '../../ansi/text';
import { progressBar } from '../../ansi/progress';

export function pomodoroMenu(completedToday: number): string {
  return clear() + '\r\n' + menu({
    title: 'POMODORO TIMER',
    items: [
      { key: '1', label: 'Start 25 min session' },
      { key: '2', label: 'Start 15 min session' },
      { key: '3', label: 'Start 50 min session' },
      { key: 'Q', label: 'Back' },
    ],
    footer: `Completed today: ${completedToday}`,
  });
}

export function timerView(
  label: string,
  durationMin: number,
  elapsedSec: number,
  completed: boolean,
  completedToday: number
): string {
  const totalSec = durationMin * 60;
  const remainingSec = Math.max(0, totalSec - elapsedSec);
  const min = Math.floor(remainingSec / 60);
  const sec = remainingSec % 60;

  let screen = clear() +
    `\r\n${sectionHeader('POMODORO')}\r\n\r\n`;

  if (label) screen += `  ${DIM}Working on: ${RESET}${BOLD}${label}${RESET}\r\n\r\n`;

  if (completed || remainingSec <= 0) {
    screen += center(`${BOLD}${FG.green}SESSION COMPLETE!${RESET}`) + '\r\n\r\n';
    screen += center(progressBar(totalSec, totalSec)) + '\r\n\r\n';
    screen += center(`${DIM}Sessions today: ${completedToday}${RESET}`) + '\r\n\r\n';
    screen += `  ${DIM}Press any key to return to menu...${RESET}`;
  } else {
    const timeStr = `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
    screen += center(`${BOLD}${FG.yellow}${timeStr}${RESET}  remaining`) + '\r\n\r\n';
    screen += center(progressBar(elapsedSec, totalSec)) + '\r\n\r\n';
    screen += `  ${DIM}Press any key to refresh  |  [C] Cancel${RESET}`;
  }

  return screen;
}

export function labelPrompt(): string {
  return `\r\n  ${theme.prompt}What are you working on? (Enter to skip): ${RESET}`;
}

export function sessionStarted(): string {
  return `\r\n  ${theme.success}Session started! Press any key to view timer.${RESET}`;
}

export function sessionCancelled(): string {
  return `\r\n  ${theme.warning}Session cancelled.${RESET}\r\n  ${DIM}Press any key to continue...${RESET}`;
}
