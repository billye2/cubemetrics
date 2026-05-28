import { clear } from '../../ansi/screen';
import { theme, RESET, BOLD, DIM, FG } from '../../ansi/colors';
import { menu } from '../../ansi/menu';
import { sectionHeader } from '../../ansi/header';
import { truncate, padRight } from '../../ansi/text';
import type { Book } from './queries';

const STATUS_LABELS: Record<string, string> = {
  to_read: `${DIM}To Read${RESET}`,
  reading: `${BOLD}${FG.cyan}Reading${RESET}`,
  completed: `${BOLD}${FG.green}Done${RESET}`,
  dropped: `${DIM}Dropped${RESET}`,
};

function stars(n: number | null): string {
  if (n === null) return `${DIM}-----${RESET}`;
  return `${FG.yellow}${'*'.repeat(n)}${DIM}${'-'.repeat(5 - n)}${RESET}`;
}

export function readingMenu(): string {
  return clear() + '\r\n' + menu({
    title: 'READING LIST',
    items: [
      { key: '1', label: 'Browse Books' },
      { key: '2', label: 'Add Book' },
      { key: '3', label: 'Update Status' },
      { key: '4', label: 'Rate Book' },
      { key: '5', label: 'Remove Book' },
      { key: 'Q', label: 'Back' },
    ],
  });
}

export function bookList(books: Book[], total: number, page: number, pageSize: number): string {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  let screen = clear() + `\r\n${sectionHeader('READING LIST')}\r\n\r\n`;

  if (books.length === 0) {
    screen += `  ${DIM}No books yet.${RESET}\r\n`;
  } else {
    for (const b of books) {
      const title = truncate(b.title, 30);
      const author = b.author ? truncate(b.author, 18) : '';
      screen += `  ${padRight(`${BOLD}${title}${RESET}`, 30)}  ${DIM}${padRight(author, 18)}${RESET}  ${STATUS_LABELS[b.status] || b.status}  ${stars(b.rating)}  ${DIM}#${b.id}${RESET}\r\n`;
    }
  }

  screen += `\r\n  ${DIM}Page ${page}/${totalPages}  |  ${total} books${RESET}`;
  if (totalPages > 1) screen += `  ${DIM}[N]ext [P]rev${RESET}`;
  screen += `\r\n  ${DIM}Q to go back${RESET}`;
  return screen;
}

export function titlePrompt(): string {
  return `\r\n  ${theme.prompt}Book title: ${RESET}`;
}

export function authorPrompt(): string {
  return `  ${theme.prompt}Author (Enter to skip): ${RESET}`;
}

export function statusPrompt(): string {
  return `\r\n  ${theme.prompt}Book #: ${RESET}`;
}

export function statusChoicePrompt(): string {
  return `  ${DIM}[1] To Read  [2] Reading  [3] Completed  [4] Dropped${RESET}\r\n  ${theme.prompt}New status: ${RESET}`;
}

export function ratePrompt(): string {
  return `\r\n  ${theme.prompt}Book #: ${RESET}`;
}

export function rateValuePrompt(): string {
  return `  ${theme.prompt}Rating (1-5): ${RESET}`;
}

export function removePrompt(): string {
  return `\r\n  ${theme.prompt}Book # to remove: ${RESET}`;
}

export function bookAdded(title: string): string {
  return `\r\n  ${theme.success}Added: ${BOLD}${title}${RESET}\r\n  ${DIM}Press any key to continue...${RESET}`;
}

export function statusUpdated(): string {
  return `\r\n  ${theme.success}Status updated!${RESET}\r\n  ${DIM}Press any key to continue...${RESET}`;
}

export function bookRated(): string {
  return `\r\n  ${theme.success}Rating saved!${RESET}\r\n  ${DIM}Press any key to continue...${RESET}`;
}

export function bookRemoved(id: number): string {
  return `\r\n  ${theme.success}Book #${id} removed.${RESET}\r\n  ${DIM}Press any key to continue...${RESET}`;
}

export function errorMsg(msg: string): string {
  return `\r\n  ${theme.error}${msg}${RESET}\r\n  ${DIM}Press any key to continue...${RESET}`;
}
