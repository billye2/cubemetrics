import { BOLD, FG, RESET } from './colors';
import { center } from './text';
import { theme } from './colors';

export function bbsBanner(): string {
  const art = [
    `${BOLD}${FG.cyan}  ██████╗ ██████╗ ██████╗ ${RESET}`,
    `${BOLD}${FG.cyan}  ██╔══██╗██╔══██╗██╔═══╝ ${RESET}`,
    `${BOLD}${FG.cyan}  ██████╔╝██████╔╝███████╗${RESET}`,
    `${BOLD}${FG.cyan}  ██╔══██╗██╔══██╗╚════██║${RESET}`,
    `${BOLD}${FG.blue}  ██████╔╝██████╔╝███████║${RESET}`,
    `${BOLD}${FG.blue}  ╚═════╝ ╚═════╝ ╚══════╝${RESET}`,
  ];

  const subtitle = `${theme.title}PurrfectBBS v1.0${RESET}`;

  return [
    ...art.map(line => center(line)),
    center(subtitle),
  ].join('\r\n');
}

export function sectionHeader(title: string): string {
  const decorated = `${theme.title}*** ${title.toUpperCase()} ***${RESET}`;
  return center(decorated);
}
