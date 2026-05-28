import type { SupabaseClient } from '@supabase/supabase-js';
import type { BBSResponse, BBSSession, InputType } from './types';
import { clear } from '../ansi/screen';
import { welcomeScreen } from '../ansi/art/welcome';
import { theme, RESET, FG, BOLD, DIM } from '../ansi/colors';
import { center } from '../ansi/text';
import { updateSession } from './session';

export async function handleAuth(
  input: string,
  inputType: InputType,
  session: BBSSession | null,
  supabase: SupabaseClient
): Promise<BBSResponse> {
  const location = session?.current_location ?? 'auth:welcome';

  switch (location) {
    case 'auth:welcome':
      return handleWelcome(input, inputType);
    default:
      return showWelcome();
  }
}

function showWelcome(): BBSResponse {
  return {
    screen: clear() + welcomeScreen(),
    inputMode: 'key',
  };
}

function handleWelcome(
  input: string,
  inputType: InputType,
): BBSResponse {
  if (inputType === 'refresh') return showWelcome();

  const key = input.toUpperCase();

  if (key === 'L') {
    return {
      screen: clear() +
        `\r\n  ${theme.info}Opening Google sign-in...${RESET}\r\n` +
        `  ${DIM}A browser window will open for authentication.${RESET}\r\n` +
        `  ${DIM}Return here after signing in.${RESET}\r\n`,
      inputMode: 'key',
      prompt: '__OAUTH_GOOGLE__',
    };
  }

  if (key === 'Q') {
    return {
      screen: clear() +
        `\r\n\r\n${center(`${BOLD}${FG.cyan}Goodbye! Call again soon...${RESET}`)}\r\n\r\n`,
      inputMode: 'key',
    };
  }

  return showWelcome();
}
