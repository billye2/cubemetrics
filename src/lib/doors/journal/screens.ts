import { clear } from '../../ansi/screen';
import { theme, RESET, BOLD, DIM, FG } from '../../ansi/colors';
import { menu } from '../../ansi/menu';
import { sectionHeader } from '../../ansi/header';
import { truncate, padRight } from '../../ansi/text';
import { horizontalLine } from '../../ansi/box';
import type { JournalEntry } from './queries';

export function journalMenu(): string {
  return clear() + '\r\n' + menu({
    title: 'JOURNAL',
    items: [
      { key: '1', label: 'Browse Entries' },
      { key: '2', label: 'Write New Entry' },
      { key: '3', label: 'Delete Entry' },
      { key: 'Q', label: 'Back' },
    ],
  });
}

export function entryList(entries: JournalEntry[], total: number, page: number, pageSize: number): string {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  let screen = clear() +
    `\r\n${sectionHeader('JOURNAL ENTRIES')}\r\n\r\n`;

  if (entries.length === 0) {
    screen += `  ${DIM}No entries yet. Start writing!${RESET}\r\n`;
  } else {
    for (const entry of entries) {
      const date = new Date(entry.entry_date).toLocaleDateString();
      const mood = entry.mood ? ` [${entry.mood}]` : '';
      const title = entry.title || truncate(entry.body, 40);
      screen += `  ${BOLD}${FG.cyan}${date}${RESET}${DIM}${mood}${RESET}  ${FG.white}${truncate(title, 50)}${RESET}  ${DIM}#${entry.id}${RESET}\r\n`;
    }
  }

  screen += `\r\n  ${DIM}Page ${page}/${totalPages}  |  ${total} entries${RESET}`;
  if (totalPages > 1) screen += `  ${DIM}[N]ext [P]rev${RESET}`;
  screen += `\r\n  ${DIM}Enter # to read  |  Q to go back${RESET}`;

  return screen;
}

export function viewEntry(entry: JournalEntry): string {
  const date = new Date(entry.entry_date).toLocaleDateString();
  let screen = clear() +
    `\r\n  ${BOLD}${FG.cyan}${date}${RESET}`;
  if (entry.title) screen += `  ${BOLD}${FG.yellow}${entry.title}${RESET}`;
  if (entry.mood) screen += `  ${DIM}[${entry.mood}]${RESET}`;
  screen += `\r\n  ${theme.border}${horizontalLine({ width: 60 })}${RESET}\r\n\r\n`;

  const lines = entry.body.split('\n');
  for (const line of lines) {
    screen += `  ${FG.white}${line}${RESET}\r\n`;
  }

  screen += `\r\n  ${DIM}Press any key to go back${RESET}`;
  return screen;
}

export function titlePrompt(): string {
  return `\r\n  ${theme.prompt}Title (optional, press Enter to skip): ${RESET}`;
}

export function bodyPrompt(): string {
  return `  ${theme.prompt}Write your entry (one paragraph): ${RESET}`;
}

export function moodPrompt(): string {
  return `  ${theme.prompt}Mood (happy/sad/neutral/anxious/calm, or Enter to skip): ${RESET}`;
}

export function deletePrompt(): string {
  return `\r\n  ${theme.prompt}Enter entry # to delete: ${RESET}`;
}

export function entryAdded(): string {
  return `\r\n  ${theme.success}Entry saved!${RESET}\r\n  ${DIM}Press any key to continue...${RESET}`;
}

export function entryDeleted(id: number): string {
  return `\r\n  ${theme.success}Entry #${id} deleted.${RESET}\r\n  ${DIM}Press any key to continue...${RESET}`;
}

export function errorMsg(msg: string): string {
  return `\r\n  ${theme.error}${msg}${RESET}\r\n  ${DIM}Press any key to continue...${RESET}`;
}
