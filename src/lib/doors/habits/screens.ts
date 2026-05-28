import { clear } from '../../ansi/screen';
import { theme, RESET, BOLD, DIM, FG } from '../../ansi/colors';
import { menu } from '../../ansi/menu';
import { sectionHeader } from '../../ansi/header';
import { padRight } from '../../ansi/text';
import { streakDisplay } from '../../ansi/progress';
import type { HabitWithStreak } from './queries';

export function habitsMenu(): string {
  return clear() + '\r\n' + menu({
    title: 'HABIT TRACKER',
    items: [
      { key: '1', label: 'View Habits & Check In' },
      { key: '2', label: 'Add Habit' },
      { key: '3', label: 'Remove Habit' },
      { key: 'Q', label: 'Back' },
    ],
  });
}

export function habitList(habits: HabitWithStreak[]): string {
  let screen = clear() +
    `\r\n${sectionHeader('YOUR HABITS')}\r\n\r\n`;

  if (habits.length === 0) {
    screen += `  ${DIM}No habits tracked yet. Add one!${RESET}\r\n`;
  } else {
    for (const h of habits) {
      const check = h.checkedToday
        ? `${BOLD}${FG.green}[x]${RESET}`
        : `${DIM}[ ]${RESET}`;
      const name = padRight(`${FG.white}${h.name}${RESET}`, 30);
      screen += `  ${check} ${name} ${streakDisplay(h.streak)}  ${DIM}#${h.id}${RESET}\r\n`;
    }
  }

  screen += `\r\n  ${DIM}Enter # to check in  |  Q to go back${RESET}`;
  return screen;
}

export function addPrompt(): string {
  return `\r\n  ${theme.prompt}Habit name: ${RESET}`;
}

export function removePrompt(): string {
  return `\r\n  ${theme.prompt}Enter habit # to remove: ${RESET}`;
}

export function checkedIn(name: string): string {
  return `\r\n  ${theme.success}Checked in: ${BOLD}${name}${RESET}\r\n  ${DIM}Press any key to continue...${RESET}`;
}

export function habitAdded(name: string): string {
  return `\r\n  ${theme.success}Habit added: ${BOLD}${name}${RESET}\r\n  ${DIM}Press any key to continue...${RESET}`;
}

export function habitRemoved(id: number): string {
  return `\r\n  ${theme.success}Habit #${id} removed.${RESET}\r\n  ${DIM}Press any key to continue...${RESET}`;
}

export function errorMsg(msg: string): string {
  return `\r\n  ${theme.error}${msg}${RESET}\r\n  ${DIM}Press any key to continue...${RESET}`;
}
