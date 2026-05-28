import { clear } from '../../ansi/screen';
import { theme, RESET, BOLD, DIM, FG } from '../../ansi/colors';
import { menu } from '../../ansi/menu';
import { sectionHeader } from '../../ansi/header';
import { padRight, center } from '../../ansi/text';
import type { CalendarEvent } from './queries';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

export function calendarMenu(): string {
  return clear() + '\r\n' + menu({
    title: 'CALENDAR',
    items: [
      { key: '1', label: 'View Month' },
      { key: '2', label: 'Add Event' },
      { key: '3', label: 'View Day' },
      { key: '4', label: 'Delete Event' },
      { key: 'Q', label: 'Back' },
    ],
  });
}

export function monthView(year: number, month: number, events: CalendarEvent[]): string {
  const eventDays = new Set(events.map(e => parseInt(e.start_date.split('-')[2])));
  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() + 1 === month;
  const todayDay = isCurrentMonth ? today.getDate() : -1;

  const firstDay = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();

  let screen = clear() +
    `\r\n${center(`${BOLD}${FG.yellow}${MONTHS[month - 1]} ${year}${RESET}`)}\r\n\r\n`;

  // Day headers
  screen += `  ${BOLD}${FG.cyan}`;
  for (const d of DAYS) screen += padRight(d, 6);
  screen += `${RESET}\r\n`;
  screen += `  ${theme.border}${'─'.repeat(42)}${RESET}\r\n`;

  // Calendar grid
  let line = '  ';
  for (let i = 0; i < firstDay; i++) line += '      ';

  for (let day = 1; day <= daysInMonth; day++) {
    const dow = (firstDay + day - 1) % 7;
    const hasEvent = eventDays.has(day);
    const isToday = day === todayDay;

    let dayStr: string;
    if (isToday && hasEvent) {
      dayStr = `${BOLD}${FG.green}[${String(day).padStart(2)}]${RESET}* `;
    } else if (isToday) {
      dayStr = `${BOLD}${FG.green}[${String(day).padStart(2)}]${RESET}  `;
    } else if (hasEvent) {
      dayStr = `${FG.yellow} ${String(day).padStart(2)} ${RESET}* `;
    } else {
      dayStr = ` ${String(day).padStart(2)}   `;
    }

    line += dayStr;

    if (dow === 6) {
      screen += line + '\r\n';
      line = '  ';
    }
  }
  if (line.trim()) screen += line + '\r\n';

  screen += `\r\n  ${DIM}[${RESET}${BOLD}${FG.green}##${RESET}${DIM}] = today  * = has events${RESET}\r\n`;
  screen += `  ${DIM}[<] Prev month  [>] Next month  [Q] Back${RESET}`;

  return screen;
}

export function dayView(date: string, events: CalendarEvent[]): string {
  const d = new Date(date + 'T00:00:00');
  const dateStr = d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  let screen = clear() +
    `\r\n${sectionHeader(dateStr)}\r\n\r\n`;

  if (events.length === 0) {
    screen += `  ${DIM}No events scheduled.${RESET}\r\n`;
  } else {
    for (const event of events) {
      const time = event.start_time ? `${FG.cyan}${event.start_time.slice(0, 5)}${RESET} ` : '';
      screen += `  ${time}${BOLD}${event.title}${RESET}  ${DIM}#${event.id}${RESET}\r\n`;
      if (event.description) screen += `         ${DIM}${event.description}${RESET}\r\n`;
    }
  }

  screen += `\r\n  ${DIM}Press any key to go back${RESET}`;
  return screen;
}

export function addDatePrompt(): string {
  return `\r\n  ${theme.prompt}Date (YYYY-MM-DD): ${RESET}`;
}

export function addTitlePrompt(): string {
  return `  ${theme.prompt}Event title: ${RESET}`;
}

export function addTimePrompt(): string {
  return `  ${theme.prompt}Time (HH:MM, or Enter to skip): ${RESET}`;
}

export function viewDayPrompt(): string {
  return `\r\n  ${theme.prompt}Date (YYYY-MM-DD): ${RESET}`;
}

export function deletePrompt(): string {
  return `\r\n  ${theme.prompt}Enter event # to delete: ${RESET}`;
}

export function eventAdded(title: string): string {
  return `\r\n  ${theme.success}Event added: ${BOLD}${title}${RESET}\r\n  ${DIM}Press any key to continue...${RESET}`;
}

export function eventDeleted(id: number): string {
  return `\r\n  ${theme.success}Event #${id} deleted.${RESET}\r\n  ${DIM}Press any key to continue...${RESET}`;
}

export function errorMsg(msg: string): string {
  return `\r\n  ${theme.error}${msg}${RESET}\r\n  ${DIM}Press any key to continue...${RESET}`;
}
