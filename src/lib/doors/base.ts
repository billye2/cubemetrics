import type { BBSResponse, BBSSession, InputType } from '../bbs/types';
import type { SupabaseClient } from '@supabase/supabase-js';
import { clear } from '../ansi/screen';
import { theme, RESET, BOLD } from '../ansi/colors';
import { box } from '../ansi/box';
import { center } from '../ansi/text';

export interface Door {
  id: string;
  name: string;
  category: string;
  description: string;
  version: string;
  handle(
    input: string,
    inputType: InputType,
    userId: string,
    session: BBSSession,
    supabase: SupabaseClient
  ): Promise<BBSResponse>;
}

export function underConstruction(doorName: string): BBSResponse {
  const content = [
    '',
    center(`${BOLD}${theme.warning}UNDER CONSTRUCTION${RESET}`),
    '',
    center(`${theme.dim}${doorName} is coming soon!${RESET}`),
    '',
    center(`${theme.dim}Press Q to go back${RESET}`),
    '',
  ];

  return {
    screen: clear() + '\r\n' + box(content, {
      style: 'double',
      borderColor: theme.warning,
      title: doorName.toUpperCase(),
      titleColor: theme.title,
    }),
    inputMode: 'key',
  };
}
