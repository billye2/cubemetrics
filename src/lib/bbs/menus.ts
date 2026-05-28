import type { BBSResponse, BBSSession, InputType } from './types';
import type { SupabaseClient } from '@supabase/supabase-js';
import { clear } from '../ansi/screen';
import { menu } from '../ansi/menu';
import { sectionHeader, bbsBanner } from '../ansi/header';
import { theme, RESET, BOLD, FG, DIM } from '../ansi/colors';
import { center } from '../ansi/text';
import { updateSession } from './session';
import { doorRegistry } from '../doors/registry';
import { goodbyeScreen } from '../ansi/art/goodbye';

const CATEGORIES = [
  { key: '1', id: 'time', label: 'Time & Focus' },
  { key: '2', id: 'tasks', label: 'Tasks & Planning' },
  { key: '3', id: 'habits', label: 'Habits & Wellness' },
  { key: '4', id: 'notes', label: 'Notes & Thinking' },
  { key: '5', id: 'finance', label: 'Finance' },
  { key: '6', id: 'learning', label: 'Learning & Reading' },
  { key: '7', id: 'org', label: 'Organization' },
] as const;

export async function handleMainMenu(
  input: string,
  inputType: InputType,
  userId: string,
  session: BBSSession,
  supabase: SupabaseClient,
  handle: string
): Promise<BBSResponse> {
  if (inputType === 'refresh' || session.current_location === 'main_menu') {
    if (inputType !== 'refresh') {
      const key = input.toUpperCase();

      // Check category selection
      const cat = CATEGORIES.find(c => c.key === key);
      if (cat) {
        await updateSession(supabase, userId, {
          current_location: `category:${cat.id}`,
        });
        return showCategory(cat.id, cat.label, userId, session, supabase);
      }

      if (key === 'P') {
        await updateSession(supabase, userId, { current_location: 'profile' });
        return showProfile(userId, supabase);
      }

      if (key === 'W') {
        return showWhosOnline(supabase);
      }

      if (key === 'Q' || key === 'X') {
        await supabase.auth.signOut();
        await updateSession(supabase, userId, {
          current_location: 'auth:welcome',
          door_state: {},
        });
        return {
          screen: clear() + goodbyeScreen(handle),
          inputMode: 'key',
        };
      }
    }

    return showMainMenu(handle);
  }

  // Category sub-menus
  if (session.current_location.startsWith('category:')) {
    return handleCategoryMenu(input, inputType, userId, session, supabase);
  }

  return showMainMenu(handle);
}

function showMainMenu(handle: string): BBSResponse {
  const items = [
    ...CATEGORIES.map(c => ({ key: c.key, label: c.label })),
    { key: 'P', label: 'My Profile' },
    { key: 'W', label: "Who's Online" },
    { key: 'Q', label: 'Log Off' },
  ];

  const screen = clear() +
    `\r\n  ${theme.dim}Logged in as: ${BOLD}${FG.cyan}${handle}${RESET}\r\n\r\n` +
    menu({
      title: 'MAIN MENU',
      items,
      columns: 1,
    });

  return { screen, inputMode: 'key' };
}

async function showCategory(
  categoryId: string,
  categoryLabel: string,
  userId: string,
  session: BBSSession,
  supabase: SupabaseClient
): Promise<BBSResponse> {
  const doors = doorRegistry.getByCategory(categoryId);
  const items = doors.map((d, i) => ({
    key: String(i + 1),
    label: d.name,
  }));
  items.push({ key: 'Q', label: 'Back to Main Menu' });

  const screen = clear() +
    `\r\n` +
    menu({
      title: categoryLabel.toUpperCase(),
      items,
      columns: 1,
      footer: 'Select a door to enter',
    });

  return { screen, inputMode: 'key' };
}

async function handleCategoryMenu(
  input: string,
  inputType: InputType,
  userId: string,
  session: BBSSession,
  supabase: SupabaseClient
): Promise<BBSResponse> {
  const categoryId = session.current_location.replace('category:', '');
  const key = input.toUpperCase();

  if (key === 'Q' || key === 'X') {
    await updateSession(supabase, userId, { current_location: 'main_menu' });
    const profile = (await supabase.from('profiles').select('handle').eq('id', userId).single()).data;
    return showMainMenu(profile?.handle || 'Unknown');
  }

  const doors = doorRegistry.getByCategory(categoryId);
  const index = parseInt(key) - 1;

  if (index >= 0 && index < doors.length) {
    const door = doors[index];
    await updateSession(supabase, userId, {
      current_location: `door:${door.id}`,
      door_state: {},
    });
    return door.handle(input, 'refresh', userId, session, supabase);
  }

  const cat = CATEGORIES.find(c => c.id === categoryId);
  return showCategory(categoryId, cat?.label || categoryId, userId, session, supabase);
}

async function showProfile(userId: string, supabase: SupabaseClient): Promise<BBSResponse> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (!profile) {
    return { screen: `\r\n  ${theme.error}Profile not found${RESET}`, inputMode: 'key' };
  }

  const screen = clear() +
    `\r\n${sectionHeader('YOUR PROFILE')}\r\n\r\n` +
    `  ${theme.info}Handle:${RESET}       ${BOLD}${profile.handle}${RESET}\r\n` +
    `  ${theme.info}Role:${RESET}         ${profile.role === 'sysop' ? `${theme.sysop}SysOp${RESET}` : 'User'}\r\n` +
    `  ${theme.info}Level:${RESET}        ${profile.level}\r\n` +
    `  ${theme.info}Total Calls:${RESET}  ${profile.total_calls}\r\n` +
    `  ${theme.info}Member Since:${RESET} ${new Date(profile.first_login).toLocaleDateString()}\r\n` +
    `  ${theme.info}Last Login:${RESET}   ${profile.last_login ? new Date(profile.last_login).toLocaleString() : 'Now'}\r\n` +
    (profile.bio ? `  ${theme.info}Bio:${RESET}          ${profile.bio}\r\n` : '') +
    (profile.location ? `  ${theme.info}Location:${RESET}     ${profile.location}\r\n` : '') +
    `\r\n  ${theme.dim}Press any key to return...${RESET}`;

  return { screen, inputMode: 'key' };
}

async function showWhosOnline(supabase: SupabaseClient): Promise<BBSResponse> {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  const { data: sessions } = await supabase
    .from('bbs_sessions')
    .select('user_id, current_location, last_activity')
    .gte('last_activity', fiveMinutesAgo);

  let screen = clear() +
    `\r\n${sectionHeader("WHO'S ONLINE")}\r\n\r\n`;

  if (!sessions || sessions.length === 0) {
    screen += `  ${theme.dim}No other users online right now.${RESET}\r\n`;
  } else {
    for (const s of sessions) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('handle, role')
        .eq('id', s.user_id)
        .single();
      if (profile) {
        const roleTag = profile.role === 'sysop' ? ` ${theme.sysop}[SysOp]${RESET}` : '';
        const loc = s.current_location.startsWith('door:')
          ? s.current_location.split(':')[1]
          : s.current_location.replace('_', ' ');
        screen += `  ${BOLD}${FG.cyan}${profile.handle}${RESET}${roleTag}  ${theme.dim}(${loc})${RESET}\r\n`;
      }
    }
  }

  screen += `\r\n  ${theme.dim}Press any key to return...${RESET}`;
  return { screen, inputMode: 'key' };
}
