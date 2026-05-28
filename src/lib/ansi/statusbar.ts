import { RESET, BOLD, FG, DIM, REVERSE, BG } from './colors';
import { COLS } from './screen';
import { padRight, visibleLength } from './text';

export function statusBar(location: string, handle: string): string {
  const breadcrumb = formatBreadcrumb(location);
  const inDoor = location.startsWith('door:') && !location.startsWith('door:feedback');
  const hint = inDoor ? '!=Feedback  Q=Back' : 'Q=Back';
  const user = handle;

  const middle = COLS - visibleLength(breadcrumb) - visibleLength(user) - visibleLength(hint) - 6;
  const spacer = ' '.repeat(Math.max(1, middle));

  return `\r\n${BG.blue}${FG.white}${BOLD} ${breadcrumb} ${RESET}${BG.blue}${spacer}${FG.white}${user}  ${DIM}${hint} ${RESET}`;
}

function formatBreadcrumb(location: string): string {
  if (location === 'main_menu') return 'Main Menu';
  if (location === 'profile') return 'Main > Profile';
  if (location.startsWith('profile:')) return `Main > Profile > ${location.split(':')[1]}`;
  if (location.startsWith('category:')) {
    const cat = location.replace('category:', '');
    return `Main > ${formatCategoryName(cat)}`;
  }
  if (location.startsWith('door:')) {
    const parts = location.split(':');
    const doorId = parts[1];
    const sub = parts.slice(2).join(' > ');
    const name = formatDoorName(doorId);
    return sub ? `${name} > ${sub}` : name;
  }
  return location;
}

function formatCategoryName(id: string): string {
  const names: Record<string, string> = {
    time: 'Time & Focus', tasks: 'Tasks', goals: 'Goals',
    habits: 'Habits', notes: 'Notes', finance: 'Finance',
    learning: 'Learning', org: 'Organization', work: 'Work', lifestyle: 'Lifestyle',
  };
  return names[id] || id;
}

function formatDoorName(id: string): string {
  return id.charAt(0).toUpperCase() + id.slice(1).replace(/([A-Z])/g, ' $1');
}
