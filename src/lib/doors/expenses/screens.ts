import { clear } from '../../ansi/screen';
import { theme, RESET, BOLD, DIM, FG } from '../../ansi/colors';
import { menu } from '../../ansi/menu';
import { sectionHeader } from '../../ansi/header';
import { padRight, truncate } from '../../ansi/text';
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
  let screen = clear() + `\r\n${sectionHeader('EXPENSES')}\r\n\r\n`;

  if (expenses.length === 0) {
    screen += `  ${DIM}No expenses recorded.${RESET}\r\n`;
  } else {
    for (const e of expenses) {
      const date = new Date(e.expense_date).toLocaleDateString();
      const amt = `$${Number(e.amount).toFixed(2)}`;
      const desc = e.description ? truncate(e.description, 25) : '';
      screen += `  ${FG.cyan}${date}${RESET}  ${BOLD}${padRight(amt, 10)}${RESET}  ${FG.yellow}${padRight(e.category, 14)}${RESET}  ${DIM}${desc}${RESET}  ${DIM}#${e.id}${RESET}\r\n`;
    }
  }

  screen += `\r\n  ${DIM}Page ${page}/${totalPages}  |  ${total} expenses${RESET}`;
  if (totalPages > 1) screen += `  ${DIM}[N]ext [P]rev${RESET}`;
  screen += `\r\n  ${DIM}Q to go back${RESET}`;
  return screen;
}

export function monthlySummary(items: { category: string; total: number }[]): string {
  const now = new Date();
  const monthName = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  let screen = clear() + `\r\n${sectionHeader(`${monthName} SUMMARY`)}\r\n\r\n`;

  if (items.length === 0) {
    screen += `  ${DIM}No expenses this month.${RESET}\r\n`;
  } else {
    let grandTotal = 0;
    for (const item of items) {
      grandTotal += item.total;
      screen += `  ${padRight(`${FG.yellow}${item.category}${RESET}`, 20)}  ${BOLD}$${item.total.toFixed(2)}${RESET}\r\n`;
    }
    screen += `  ${theme.border}${'─'.repeat(32)}${RESET}\r\n`;
    screen += `  ${padRight(`${BOLD}TOTAL${RESET}`, 20)}  ${BOLD}${FG.green}$${grandTotal.toFixed(2)}${RESET}\r\n`;
  }

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
