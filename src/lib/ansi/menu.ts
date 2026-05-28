import { theme, RESET } from './colors';
import { box } from './box';
import { currentCols } from './context';

interface MenuItem {
  key: string;
  label: string;
  description?: string;
}

interface MenuOptions {
  title: string;
  items: MenuItem[];
  columns?: 1 | 2;
  width?: number;
  footer?: string;
}

export function menu(options: MenuOptions): string {
  const cols = currentCols();
  const { title, items, footer } = options;
  const width = options.width ?? cols;
  const columns = cols <= 40 ? 1 : (options.columns ?? 1);
  const innerWidth = width - 4;

  const content: string[] = [];

  if (columns === 2) {
    const colWidth = Math.floor(innerWidth / 2);
    for (let i = 0; i < items.length; i += 2) {
      const left = formatMenuItem(items[i], colWidth);
      const right = i + 1 < items.length ? formatMenuItem(items[i + 1], colWidth) : '';
      content.push(left + right);
    }
  } else {
    for (const item of items) {
      content.push(formatMenuItem(item, innerWidth));
    }
  }

  if (footer) {
    content.push('');
    content.push(`${theme.dim}${footer}${RESET}`);
  }

  return box(content, {
    style: 'double',
    width,
    borderColor: theme.border,
    title,
    titleColor: theme.title,
  });
}

function formatMenuItem(item: MenuItem, width: number): string {
  const keyStr = `${theme.menuKey}[${item.key}]${RESET} `;
  const labelStr = `${theme.menuLabel}${item.label}${RESET}`;
  return keyStr + labelStr;
}
