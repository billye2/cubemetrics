import { clear } from '../../ansi/screen';
import { theme, RESET, BOLD, DIM } from '../../ansi/colors';
import { menu } from '../../ansi/menu';
import { sectionHeader } from '../../ansi/header';
import { truncate } from '../../ansi/text';
import type { Feedback } from './queries';

const CATEGORIES = [
  { key: '1', label: 'Bug Report', id: 'bug' },
  { key: '2', label: 'Feature Request', id: 'feature' },
  { key: '3', label: 'Improvement', id: 'improvement' },
  { key: '4', label: 'Other', id: 'other' },
];

export { CATEGORIES };

export function feedbackMenu(): string {
  return clear() + '\r\n' + menu({
    title: 'FEEDBACK',
    items: [
      { key: '1', label: 'Submit Feedback' },
      { key: '2', label: 'My Submissions' },
      { key: '3', label: 'Feedback Board' },
      { key: 'Q', label: 'Back' },
    ],
    footer: 'Your feedback helps improve XPBBS!',
  });
}

export function categoryMenu(): string {
  return clear() + '\r\n' + menu({
    title: 'FEEDBACK TYPE',
    items: [
      ...CATEGORIES.map(c => ({ key: c.key, label: c.label })),
      { key: 'Q', label: 'Cancel' },
    ],
  });
}

export function bodyPrompt(): string {
  return `\r\n  ${theme.prompt}Describe your feedback: ${RESET}`;
}

export function submitted(): string {
  return `\r\n  ${theme.success}Feedback submitted! Thank you.${RESET}\r\n  ${DIM}Press any key to continue...${RESET}`;
}

export function feedbackList(items: Feedback[], total: number, page: number, pageSize: number): string {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  let screen = clear() + `\r\n${sectionHeader('MY FEEDBACK')}\r\n\r\n`;

  if (items.length === 0) {
    screen += `  ${DIM}No feedback submitted yet.${RESET}\r\n`;
  } else {
    for (const f of items) {
      const date = new Date(f.created_at).toLocaleDateString();
      const tag = categoryTag(f.category);
      const status = statusTag(f.status);
      screen += `  ${tag} ${BOLD}${truncate(f.body, 42)}${RESET}  ${status}  ${DIM}${date}${RESET}\r\n`;
    }
  }

  screen += `\r\n  ${DIM}Page ${page}/${totalPages}  |  ${total} total${RESET}`;
  if (totalPages > 1) screen += `  ${DIM}[N]ext [P]rev${RESET}`;
  screen += `\r\n  ${DIM}Q to go back${RESET}`;
  return screen;
}

export function feedbackBoard(items: Feedback[], total: number, page: number, pageSize: number): string {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  let screen = clear() + `\r\n${sectionHeader('FEEDBACK BOARD')}\r\n\r\n`;

  if (items.length === 0) {
    screen += `  ${DIM}No feedback yet. Be the first!${RESET}\r\n`;
  } else {
    for (const f of items) {
      const date = new Date(f.created_at).toLocaleDateString();
      const tag = categoryTag(f.category);
      const status = statusTag(f.status);
      screen += `  ${tag} ${truncate(f.body, 42)}  ${status}  ${DIM}${date}${RESET}\r\n`;
    }
  }

  screen += `\r\n  ${DIM}Page ${page}/${totalPages}  |  ${total} total${RESET}`;
  if (totalPages > 1) screen += `  ${DIM}[N]ext [P]rev${RESET}`;
  screen += `\r\n  ${DIM}Q to go back${RESET}`;
  return screen;
}

export function errorMsg(msg: string): string {
  return `\r\n  ${theme.error}${msg}${RESET}\r\n  ${DIM}Press any key to continue...${RESET}`;
}

function categoryTag(cat: string): string {
  const colors: Record<string, string> = {
    bug: theme.error,
    feature: theme.info,
    improvement: theme.highlight,
    other: theme.dim,
  };
  const labels: Record<string, string> = {
    bug: 'BUG',
    feature: 'FEAT',
    improvement: 'IMPR',
    other: 'OTHR',
  };
  const color = colors[cat] || theme.dim;
  return `${color}[${labels[cat] || cat.toUpperCase().slice(0, 4)}]${RESET}`;
}

function statusTag(status: string): string {
  if (status === 'reviewed') return `${theme.success}[done]${RESET}`;
  return `${DIM}[new]${RESET}`;
}
