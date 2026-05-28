import { clear } from '../../ansi/screen';
import { theme, RESET, BOLD, FG, DIM } from '../../ansi/colors';
import { menu } from '../../ansi/menu';
import { padRight, truncate } from '../../ansi/text';
import { box } from '../../ansi/box';
import type { Todo } from './queries';

export function todoMenu(): string {
  return clear() + '\r\n' + menu({
    title: 'TO-DO LIST',
    items: [
      { key: '1', label: 'View Tasks' },
      { key: '2', label: 'Add Task' },
      { key: '3', label: 'Complete Task' },
      { key: '4', label: 'Delete Task' },
      { key: 'A', label: 'Show All (incl. completed)' },
      { key: 'Q', label: 'Back' },
    ],
  });
}

export function todoList(todos: Todo[], total: number, page: number, pageSize: number, showCompleted: boolean): string {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const rows: string[] = [''];
  if (todos.length === 0) {
    rows.push(`  ${DIM}No tasks found. Add one from the menu!${RESET}`);
  } else {
    rows.push(`  ${BOLD}${padRight('', 4)}${padRight('P', 4)}${padRight('Task', 48)}ID${RESET}`);
    rows.push(`  ${theme.border}${'─'.repeat(62)}${RESET}`);
    for (const todo of todos) {
      const check = todo.completed
        ? `${BOLD}${FG.green}[x]${RESET}`
        : `${FG.white}[ ]${RESET}`;
      const prio = todo.priority === 2
        ? `${BOLD}${FG.red}!!${RESET} `
        : todo.priority === 1
          ? `${FG.yellow}!${RESET}  `
          : '   ';
      const title = todo.completed
        ? `${DIM}${todo.title}${RESET}`
        : `${FG.white}${todo.title}${RESET}`;

      rows.push(`  ${check} ${prio}${padRight(truncate(title, 46), 48)}${DIM}#${todo.id}${RESET}`);
    }
  }
  rows.push('');

  let screen = clear() + '\r\n';
  screen += box(rows, {
    style: 'single',
    width: 70,
    borderColor: theme.border,
    title: showCompleted ? 'ALL TASKS' : 'ACTIVE TASKS',
    titleColor: theme.title,
  });

  screen += `\r\n  ${DIM}Page ${page}/${totalPages}  |  ${total} tasks${RESET}`;
  if (totalPages > 1) screen += `  ${DIM}[N]ext [P]rev${RESET}`;
  screen += `  ${DIM}[Q] Back${RESET}`;

  return screen;
}

export function addPrompt(): string {
  return `\r\n  ${theme.prompt}Enter task description: ${RESET}`;
}

export function completePrompt(): string {
  return `\r\n  ${theme.prompt}Enter task # to complete: ${RESET}`;
}

export function deletePrompt(): string {
  return `\r\n  ${theme.prompt}Enter task # to delete: ${RESET}`;
}

export function taskAdded(title: string): string {
  return `\r\n  ${theme.success}Task added: ${BOLD}${title}${RESET}\r\n  ${DIM}Press any key to continue...${RESET}`;
}

export function taskCompleted(id: number): string {
  return `\r\n  ${theme.success}Task #${id} marked complete!${RESET}\r\n  ${DIM}Press any key to continue...${RESET}`;
}

export function taskDeleted(id: number): string {
  return `\r\n  ${theme.success}Task #${id} deleted!${RESET}\r\n  ${DIM}Press any key to continue...${RESET}`;
}

export function taskError(msg: string): string {
  return `\r\n  ${theme.error}${msg}${RESET}\r\n  ${DIM}Press any key to continue...${RESET}`;
}
