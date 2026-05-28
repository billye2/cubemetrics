import { BOLD, RESET, DIM } from '../colors';
import { center } from '../text';
import { bbsBanner } from '../header';
import { box } from '../box';
import { theme } from '../colors';

export function welcomeScreen(stats?: { totalUsers: number; totalCalls: number; onlineNow: number }): string {
  const lines: string[] = [];

  lines.push(bbsBanner());
  lines.push('');

  const infoLines = [
    '',
    center(`${theme.info}Welcome to PurrfectBBS${RESET}`),
    center(`${DIM}A throwback to simpler times${RESET}`),
    '',
  ];

  if (stats) {
    infoLines.push(
      `  ${theme.info}Total Users:${RESET}  ${BOLD}${stats.totalUsers}${RESET}`,
      `  ${theme.info}Total Calls:${RESET}  ${BOLD}${stats.totalCalls}${RESET}`,
      `  ${theme.info}Online Now:${RESET}   ${BOLD}${stats.onlineNow}${RESET}`,
      '',
    );
  }

  infoLines.push(
    `  ${theme.menuKey}[L]${RESET} ${theme.menuLabel}Login with Google${RESET}`,
    `  ${theme.menuKey}[Q]${RESET} ${theme.menuLabel}Quit${RESET}`,
    '',
  );

  lines.push(box(infoLines, {
    style: 'double',
    borderColor: theme.border,
    title: 'WELCOME',
    titleColor: theme.title,
  }));

  return lines.join('\r\n');
}
