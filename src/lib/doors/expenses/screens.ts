import { clear } from '../../ansi/screen';
import { theme, RESET, BOLD, DIM, FG } from '../../ansi/colors';
import { menu } from '../../ansi/menu';
import { sectionHeader } from '../../ansi/header';
import { padRight, truncate } from '../../ansi/text';
import { box } from '../../ansi/box';
import { CATEGORIES } from './queries';
import type { Expense } from './queries';

export function expensesMenu(): string {
  return clear() + '\r\n' + menu({
    title: 'EXPENSE TRACKER',
    items: [
      { key: '1', label: 'View Expenses' },
      { key: '2', label: 'Add Expense' },
      { key: '3', label: 'Monthly Summary' },
      { key: '4', label: 'Delete Expense' },
      { key: 'Q', label: 'Back' },
    ],
  });
}

export function expenseList(expenses: Expense[], total: number, page: number, pageSize: number): string {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const rows: string[] = [''];
  if (expenses.length === 0) {
    rows.push(`  ${DIM}No expenses recorded.${RESET}`);
  } else {
    rows.push(`  ${BOLD}${padRight('Date', 14)}${padRight('Amount', 12)}${padRight('Category', 14)}Description${RESET}`);
    rows.push(`  ${theme.border}${'─'.repeat(62)}${RESET}`);
    for (const e of expenses) {
      const date = new Date(e.expense_date).toLocaleDateString();
      const amt = `$${Number(e.amount).toFixed(2)}`;
      const desc = e.description ? truncate(e.description, 20) : '';
      rows.push(`  ${FG.cyan}${padRight(date, 14)}${RESET}${BOLD}${padRight(amt, 12)}${RESET}${FG.yellow}${padRight(e.category, 14)}${RESET}${DIM}${desc}${RESET}  ${DIM}#${e.id}${RESET}`);
    }
  }
  rows.push('');

  let screen = clear() + '\r\n';
  screen += box(rows, {
    style: 'single',
    width: 72,
    borderColor: theme.border,
    title: 'EXPENSES',
    titleColor: theme.title,
  });

  screen += `\r\n  ${DIM}Page ${page}/${totalPages}  |  ${total} expenses${RESET}`;
  if (totalPages > 1) screen += `  ${DIM}[N]ext [P]rev${RESET}`;
  screen += `  ${DIM}[Q] Back${RESET}`;
  return screen;
}

export function monthlySummary(items: { category: string; total: number }[]): string {
  const now = new Date();
  const monthName = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const rows: string[] = [''];
  if (items.length === 0) {
    rows.push(`  ${DIM}No expenses this month.${RESET}`);
  } else {
    let grandTotal = 0;
    const maxAmt = Math.max(...items.map(i => i.total));
    for (const item of items) {
      grandTotal += item.total;
      const barLen = Math.round((item.total / maxAmt) * 20);
      const bar = `${FG.cyan}${'█'.repeat(barLen)}${RESET}`;
      rows.push(`  ${FG.yellow}${padRight(item.category, 16)}${RESET} ${BOLD}${padRight('$' + item.total.toFixed(2), 10)}${RESET} ${bar}`);
    }
    rows.push(`  ${theme.border}${'─'.repeat(48)}${RESET}`);
    rows.push(`  ${BOLD}${padRight('TOTAL', 16)} ${FG.green}$${grandTotal.toFixed(2)}${RESET}`);
  }
  rows.push('');

  let screen = clear() + '\r\n';
  screen += box(rows, {
    style: 'double',
    width: 54,
    borderColor: theme.border,
    title: monthName.toUpperCase(),
    titleColor: theme.title,
  });

  screen += `\r\n  ${DIM}Press any key to go back${RESET}`;
  return screen;
}

export function amountPrompt(): string {
  return `\r\n  ${theme.prompt}Amount ($): ${RESET}`;
}

export function categoryPrompt(): string {
  const cats = CATEGORIES.map((c, i) => `[${i + 1}] ${c}`).join('  ');
  return `  ${DIM}${cats}${RESET}\r\n  ${theme.prompt}Category #: ${RESET}`;
}

export function descriptionPrompt(): string {
  return `  ${theme.prompt}Description (Enter to skip): ${RESET}`;
}

export function deletePrompt(): string {
  return `\r\n  ${theme.prompt}Enter expense # to delete: ${RESET}`;
}

export function expenseAdded(amount: number, category: string): string {
  return `\r\n  ${theme.success}Expense added: $${amount.toFixed(2)} (${category})${RESET}\r\n  ${DIM}Press any key to continue...${RESET}`;
}

export function expenseDeleted(id: number): string {
  return `\r\n  ${theme.success}Expense #${id} deleted.${RESET}\r\n  ${DIM}Press any key to continue...${RESET}`;
}

export function errorMsg(msg: string): string {
  return `\r\n  ${theme.error}${msg}${RESET}\r\n  ${DIM}Press any key to continue...${RESET}`;
}
