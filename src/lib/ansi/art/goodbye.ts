import { BOLD, FG, RESET, DIM } from '../colors';
import { center } from '../text';
import { theme } from '../colors';

export function goodbyeScreen(handle: string): string {
  const lines = [
    '',
    '',
    center(`${BOLD}${FG.cyan}Thanks for calling, ${FG.yellow}${handle}${FG.cyan}!${RESET}`),
    '',
    center(`${DIM}Call again soon...${RESET}`),
    '',
    center(`${theme.border}═══════════════════════════════${RESET}`),
    center(`${DIM}PurrfectBBS v1.0${RESET}`),
    center(`${theme.border}═══════════════════════════════${RESET}`),
    '',
    '',
  ];
  return lines.join('\r\n');
}
