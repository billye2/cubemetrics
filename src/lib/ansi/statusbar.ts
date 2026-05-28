import { RESET, BOLD, FG, DIM, REVERSE, BG } from './colors';
import { currentCols } from './context';
import { padRight, visibleLength } from './text';

export function statusBar(location: string, handle: string): string {
  const cols = currentCols();
  const narrow = cols <= 40;
  const breadcrumb = formatBreadcrumb(location, narrow);
  const inDoor = location.startsWith('door:') && !location.startsWith('door:feedback');
  const hint = narrow
    ? (inDoor ? '!=FB Q=Bk' : 'Q=Bk')
    : (inDoor ? '!=Feedback  Q=Back' : 'Q=Back');
  const user = narrow ? '' : handle;

  const middle = cols - visibleLength(breadcrumb) - visibleLength(user) - visibleLength(hint) - (narrow ? 4 : 6);
  const spacer = ' '.repeat(Math.max(1, middle));
  const userBlock = narrow ? '' : `${FG.white}${user}  `;

  return `\r\n${BG.blue}${FG.white}${BOLD} ${breadcrumb} ${RESET}${BG.blue}${spacer}${userBlock}${DIM}${hint} ${RESET}`;
}

function formatBreadcrumb(location: string, narrow = false): string {
  if (location === 'main_menu') return narrow ? 'Main' : 'Main Menu';
  if (location === 'profile') return narrow ? 'Profile' : 'Main > Profile';
  if (location.startsWith('profile:')) {
    const sub = location.split(':')[1];
    return narrow ? `Profile > ${sub}` : `Main > Profile > ${sub}`;
  }
  if (location.startsWith('category:')) {
    const cat = location.replace('category:', '');
    return narrow ? formatCategoryName(cat) : `Main > ${formatCategoryName(cat)}`;
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
