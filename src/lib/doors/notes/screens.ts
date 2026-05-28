import { clear } from '../../ansi/screen';
import { theme, RESET, BOLD, DIM, FG } from '../../ansi/colors';
import { menu } from '../../ansi/menu';
import { sectionHeader } from '../../ansi/header';
import { truncate, padRight } from '../../ansi/text';
import { horizontalLine } from '../../ansi/box';
import type { Note } from './queries';

export function notesMenu(): string {
  return clear() + '\r\n' + menu({
    title: 'QUICK NOTES',
    items: [
      { key: '1', label: 'Browse Notes' },
      { key: '2', label: 'New Note' },
      { key: '3', label: 'Search Notes' },
      { key: '4', label: 'Delete Note' },
      { key: 'Q', label: 'Back' },
    ],
  });
}

export function noteList(notes: Note[], total: number, page: number, pageSize: number): string {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  let screen = clear() + `\r\n${sectionHeader('NOTES')}\r\n\r\n`;

  if (notes.length === 0) {
    screen += `  ${DIM}No notes yet.${RESET}\r\n`;
  } else {
    for (const n of notes) {
      const pin = n.pinned ? `${FG.yellow}*${RESET} ` : '  ';
      const title = n.title || truncate(n.body, 40);
      const date = new Date(n.updated_at).toLocaleDateString();
      screen += `  ${pin}${BOLD}${truncate(title, 45)}${RESET}  ${DIM}${date}${RESET}  ${DIM}#${n.id}${RESET}\r\n`;
    }
  }

  screen += `\r\n  ${DIM}Page ${page}/${totalPages}  |  ${total} notes${RESET}`;
  if (totalPages > 1) screen += `  ${DIM}[N]ext [P]rev${RESET}`;
  screen += `\r\n  ${DIM}Enter # to read  |  [T]oggle pin  |  Q to go back${RESET}`;
  return screen;
}

export function viewNote(note: Note): string {
  let screen = clear() + '\r\n';
  if (note.title) screen += `  ${BOLD}${FG.yellow}${note.title}${RESET}\r\n`;
  screen += `  ${DIM}${new Date(note.updated_at).toLocaleString()}${RESET}`;
  if (note.pinned) screen += `  ${FG.yellow}[pinned]${RESET}`;
  screen += `\r\n  ${theme.border}${horizontalLine({ width: 60 })}${RESET}\r\n\r\n`;

  const lines = note.body.split('\n');
  for (const line of lines) {
    screen += `  ${FG.white}${line}${RESET}\r\n`;
  }

  screen += `\r\n  ${DIM}Press any key to go back${RESET}`;
  return screen;
}

export function searchResults(notes: Note[], query: string): string {
  let screen = clear() + `\r\n${sectionHeader(`SEARCH: "${query}"`)}\r\n\r\n`;

  if (notes.length === 0) {
    screen += `  ${DIM}No matches found.${RESET}\r\n`;
  } else {
    for (const n of notes) {
      const title = n.title || truncate(n.body, 40);
      screen += `  ${BOLD}${truncate(title, 50)}${RESET}  ${DIM}#${n.id}${RESET}\r\n`;
    }
  }

  screen += `\r\n  ${DIM}Press any key to go back${RESET}`;
  return screen;
}

export function titlePrompt(): string {
  return `\r\n  ${theme.prompt}Title (optional): ${RESET}`;
}

export function bodyPrompt(): string {
  return `  ${theme.prompt}Note content: ${RESET}`;
}

export function searchPrompt(): string {
  return `\r\n  ${theme.prompt}Search: ${RESET}`;
}

export function deletePrompt(): string {
  return `\r\n  ${theme.prompt}Enter note # to delete: ${RESET}`;
}

export function pinPrompt(): string {
  return `\r\n  ${theme.prompt}Enter note # to toggle pin: ${RESET}`;
}

export function noteAdded(): string {
  return `\r\n  ${theme.success}Note saved!${RESET}\r\n  ${DIM}Press any key to continue...${RESET}`;
}

export function noteDeleted(id: number): string {
  return `\r\n  ${theme.success}Note #${id} deleted.${RESET}\r\n  ${DIM}Press any key to continue...${RESET}`;
}

export function pinToggled(id: number): string {
  return `\r\n  ${theme.success}Note #${id} pin toggled.${RESET}\r\n  ${DIM}Press any key to continue...${RESET}`;
}

export function errorMsg(msg: string): string {
  return `\r\n  ${theme.error}${msg}${RESET}\r\n  ${DIM}Press any key to continue...${RESET}`;
}
