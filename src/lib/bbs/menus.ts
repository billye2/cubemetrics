import type { BBSResponse, BBSSession, InputType } from './types';
import type { SupabaseClient } from '@supabase/supabase-js';
import { clear } from '../ansi/screen';
import { menu } from '../ansi/menu';
import { sectionHeader, bbsBanner } from '../ansi/header';
import { theme, RESET, BOLD, FG, DIM } from '../ansi/colors';
import { center, truncate } from '../ansi/text';
import { updateSession } from './session';
import { doorRegistry } from '../doors/registry';
import { goodbyeScreen } from '../ansi/art/goodbye';

const CATEGORIES = [
  { key: '1', id: 'time', label: 'Time & Focus' },
  { key: '2', id: 'tasks', label: 'Tasks & Planning' },
  { key: '3', id: 'goals', label: 'Goals & Progress' },
  { key: '4', id: 'habits', label: 'Habits & Wellness' },
  { key: '5', id: 'notes', label: 'Notes & Thinking' },
  { key: '6', id: 'finance', label: 'Finance' },
  { key: '7', id: 'learning', label: 'Learning & Reading' },
  { key: '8', id: 'org', label: 'Organization' },
  { key: '9', id: 'work', label: 'Work & Collaboration' },
  { key: '0', id: 'lifestyle', label: 'Lifestyle' },
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

      // Recent door quick-access (F1-F5 mapped to a-e)
      const recentIdx = 'ABCDE'.indexOf(key);
      if (recentIdx >= 0) {
        const recent = (session.recent_doors) || [];
        if (recentIdx < recent.length) {
          const doorId = recent[recentIdx];
          const door = doorRegistry.get(doorId);
          if (door) {
            await updateSession(supabase, userId, { current_location: `door:${doorId}`, door_state: {} });
            return door.handle('', 'refresh', userId, session, supabase);
          }
        }
      }

      if (key === '/') {
        await updateSession(supabase, userId, { current_location: 'search' });
        return {
          screen: clear() +
            `\r\n${sectionHeader('GLOBAL SEARCH')}\r\n\r\n` +
            `  ${DIM}Search across all your data: todos, notes, journal,${RESET}\r\n` +
            `  ${DIM}expenses, reading list, goals, and more.${RESET}\r\n`,
          inputMode: 'line',
          prompt: `\r\n  ${theme.prompt}Search: ${RESET}`,
        };
      }

      if (key === 'P') {
        await updateSession(supabase, userId, { current_location: 'profile' });
        return showProfileMenu(userId, supabase);
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

    const recent = (session.recent_doors) || [];
    return showMainMenu(handle, recent);
  }

  // Category sub-menus
  if (session.current_location.startsWith('category:')) {
    return handleCategoryMenu(input, inputType, userId, session, supabase);
  }

  const recent = (session.recent_doors) || [];
  return showMainMenu(handle, recent);
}

function showMainMenu(handle: string, recentDoors: string[] = []): BBSResponse {
  let screen = clear() +
    `\r\n  ${theme.dim}Logged in as: ${BOLD}${FG.cyan}${handle}${RESET}\r\n`;

  // Recent doors quick-access
  if (recentDoors.length > 0) {
    screen += `\r\n  ${theme.title}RECENT:${RESET} `;
    const keys = 'ABCDE';
    for (let i = 0; i < recentDoors.length; i++) {
      const door = doorRegistry.get(recentDoors[i]);
      if (door) {
        screen += ` ${theme.menuKey}[${keys[i]}]${RESET} ${DIM}${door.name}${RESET}`;
      }
    }
    screen += '\r\n';
  }

  screen += '\r\n';

  const items = [
    ...CATEGORIES.map(c => ({ key: c.key, label: c.label })),
    { key: '/', label: 'Search All' },
    { key: 'P', label: 'My Profile' },
    { key: 'W', label: "Who's Online" },
    { key: 'Q', label: 'Log Off' },
  ];

  screen += menu({
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

function renderProfileCard(profile: Record<string, unknown>): string {
  return clear() +
    `\r\n${sectionHeader('YOUR PROFILE')}\r\n\r\n` +
    `  ${theme.info}Alias:${RESET}        ${BOLD}${FG.cyan}${profile.handle}${RESET}\r\n` +
    `  ${theme.info}Role:${RESET}         ${profile.role === 'sysop' ? `${theme.sysop}SysOp${RESET}` : 'User'}\r\n` +
    `  ${theme.info}Level:${RESET}        ${profile.level}\r\n` +
    `  ${theme.info}Total Calls:${RESET}  ${profile.total_calls}\r\n` +
    `  ${theme.info}Member Since:${RESET} ${new Date(profile.first_login as string).toLocaleDateString()}\r\n` +
    `  ${theme.info}Last Login:${RESET}   ${profile.last_login ? new Date(profile.last_login as string).toLocaleString() : 'Now'}\r\n` +
    `  ${theme.info}Bio:${RESET}          ${(profile.bio as string) || `${DIM}(not set)${RESET}`}\r\n` +
    `  ${theme.info}Location:${RESET}     ${(profile.location as string) || `${DIM}(not set)${RESET}`}\r\n`;
}

async function showProfileMenu(userId: string, supabase: SupabaseClient): Promise<BBSResponse> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (!profile) {
    return { screen: `\r\n  ${theme.error}Profile not found${RESET}`, inputMode: 'key' };
  }

  const screen = renderProfileCard(profile) +
    '\r\n' +
    menu({
      title: 'PROFILE',
      items: [
        { key: '1', label: 'Change Alias' },
        { key: '2', label: 'Edit Bio' },
        { key: '3', label: 'Edit Location' },
        { key: 'Q', label: 'Back to Main Menu' },
      ],
    });

  return { screen, inputMode: 'key' };
}

export async function handleProfile(
  input: string,
  inputType: InputType,
  userId: string,
  session: BBSSession,
  supabase: SupabaseClient,
  handle: string
): Promise<BBSResponse> {
  const loc = session.current_location;

  switch (loc) {
    case 'profile': {
      if (inputType === 'refresh') return showProfileMenu(userId, supabase);
      const key = input.toUpperCase();
      switch (key) {
        case '1': {
          await updateSession(supabase, userId, { current_location: 'profile:alias' });
          return {
            screen: `\r\n  ${theme.info}Current alias: ${BOLD}${handle}${RESET}\r\n`,
            inputMode: 'line',
            prompt: `  ${theme.prompt}New alias: ${RESET}`,
          };
        }
        case '2': {
          await updateSession(supabase, userId, { current_location: 'profile:bio' });
          return {
            screen: '',
            inputMode: 'line',
            prompt: `\r\n  ${theme.prompt}Bio: ${RESET}`,
          };
        }
        case '3': {
          await updateSession(supabase, userId, { current_location: 'profile:location' });
          return {
            screen: '',
            inputMode: 'line',
            prompt: `\r\n  ${theme.prompt}Location: ${RESET}`,
          };
        }
        case 'Q':
        case 'X': {
          await updateSession(supabase, userId, { current_location: 'main_menu' });
          const { data: p } = await supabase.from('profiles').select('handle').eq('id', userId).single();
          return showMainMenu(p?.handle || handle);
        }
        default:
          return showProfileMenu(userId, supabase);
      }
    }

    case 'profile:alias': {
      const alias = input.trim();
      if (!alias || alias.length < 2 || alias.length > 20) {
        await updateSession(supabase, userId, { current_location: 'profile' });
        return {
          screen: `\r\n  ${theme.error}Alias must be 2-20 characters.${RESET}\r\n  ${DIM}Press any key...${RESET}`,
          inputMode: 'key',
        };
      }
      const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .eq('handle', alias)
        .neq('id', userId)
        .single();
      if (existing) {
        await updateSession(supabase, userId, { current_location: 'profile' });
        return {
          screen: `\r\n  ${theme.error}Alias already taken!${RESET}\r\n  ${DIM}Press any key...${RESET}`,
          inputMode: 'key',
        };
      }
      await supabase.from('profiles').update({ handle: alias }).eq('id', userId);
      await updateSession(supabase, userId, { current_location: 'profile' });
      return {
        screen: `\r\n  ${theme.success}Alias changed to: ${BOLD}${alias}${RESET}\r\n  ${DIM}Press any key...${RESET}`,
        inputMode: 'key',
      };
    }

    case 'profile:bio': {
      await supabase.from('profiles').update({ bio: input.trim() }).eq('id', userId);
      await updateSession(supabase, userId, { current_location: 'profile' });
      return {
        screen: `\r\n  ${theme.success}Bio updated!${RESET}\r\n  ${DIM}Press any key...${RESET}`,
        inputMode: 'key',
      };
    }

    case 'profile:location': {
      await supabase.from('profiles').update({ location: input.trim() }).eq('id', userId);
      await updateSession(supabase, userId, { current_location: 'profile' });
      return {
        screen: `\r\n  ${theme.success}Location updated!${RESET}\r\n  ${DIM}Press any key...${RESET}`,
        inputMode: 'key',
      };
    }

    default: {
      await updateSession(supabase, userId, { current_location: 'profile' });
      return showProfileMenu(userId, supabase);
    }
  }
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

export async function handleGlobalSearch(
  input: string,
  inputType: InputType,
  userId: string,
  session: BBSSession,
  supabase: SupabaseClient,
  handle: string
): Promise<BBSResponse> {
  if (session.current_location === 'search' && inputType === 'line') {
    const query = input.trim();
    if (!query) {
      await updateSession(supabase, userId, { current_location: 'main_menu' });
      const recent = (session.recent_doors) || [];
      return showMainMenu(handle, recent);
    }

    const q = `%${query}%`;

    const [todos, notes, journal, expenses, reading, goals, checklists, logs] = await Promise.all([
      supabase.from('todos').select('id, title').eq('user_id', userId).ilike('title', q).limit(5),
      supabase.from('notes').select('id, title, body').eq('user_id', userId).or(`title.ilike.${q},body.ilike.${q}`).limit(5),
      supabase.from('journal_entries').select('id, title, body').eq('user_id', userId).or(`title.ilike.${q},body.ilike.${q}`).limit(5),
      supabase.from('expenses').select('id, description, category, amount').eq('user_id', userId).or(`description.ilike.${q},category.ilike.${q}`).limit(5),
      supabase.from('reading_list').select('id, title, author').eq('user_id', userId).or(`title.ilike.${q},author.ilike.${q}`).limit(5),
      supabase.from('goals').select('id, title').eq('user_id', userId).ilike('title', q).limit(5),
      supabase.from('checklists').select('id, title, list_type').eq('user_id', userId).ilike('title', q).limit(5),
      supabase.from('logs').select('id, title, body, log_type').eq('user_id', userId).or(`title.ilike.${q},body.ilike.${q}`).limit(5),
    ]);

    let screen = clear() +
      `\r\n${sectionHeader(`SEARCH: "${query}"`)}\r\n`;

    let totalResults = 0;

    const sections: { label: string; items: { text: string }[] }[] = [];

    if (todos.data?.length) {
      sections.push({ label: 'To-Do', items: todos.data.map(t => ({ text: `${truncate(t.title, 50)}  ${DIM}#${t.id}${RESET}` })) });
    }
    if (notes.data?.length) {
      sections.push({ label: 'Notes', items: notes.data.map(n => ({ text: `${truncate(n.title || n.body, 50)}  ${DIM}#${n.id}${RESET}` })) });
    }
    if (journal.data?.length) {
      sections.push({ label: 'Journal', items: journal.data.map(j => ({ text: `${truncate(j.title || j.body, 50)}  ${DIM}#${j.id}${RESET}` })) });
    }
    if (reading.data?.length) {
      sections.push({ label: 'Reading', items: reading.data.map(r => ({ text: `${truncate(r.title, 35)} ${DIM}by ${r.author}${RESET}` })) });
    }
    if (goals.data?.length) {
      sections.push({ label: 'Goals', items: goals.data.map(g => ({ text: `${truncate(g.title, 50)}  ${DIM}#${g.id}${RESET}` })) });
    }
    if (expenses.data?.length) {
      sections.push({ label: 'Expenses', items: expenses.data.map(e => ({ text: `$${Number(e.amount).toFixed(2)} ${e.category} ${DIM}${e.description || ''}${RESET}` })) });
    }
    if (checklists.data?.length) {
      sections.push({ label: 'Lists', items: checklists.data.map(c => ({ text: `${truncate(c.title, 40)} ${DIM}(${c.list_type})${RESET}` })) });
    }
    if (logs.data?.length) {
      sections.push({ label: 'Logs', items: logs.data.map(l => ({ text: `${truncate(l.title || l.body, 40)} ${DIM}(${l.log_type})${RESET}` })) });
    }

    for (const section of sections) {
      screen += `\r\n  ${BOLD}${FG.yellow}${section.label}${RESET}\r\n`;
      for (const item of section.items) {
        screen += `    ${FG.white}${item.text}${RESET}\r\n`;
        totalResults++;
      }
    }

    if (totalResults === 0) {
      screen += `\r\n  ${DIM}No results found for "${query}"${RESET}\r\n`;
    } else {
      screen += `\r\n  ${DIM}${totalResults} result${totalResults === 1 ? '' : 's'} found${RESET}`;
    }

    screen += `\r\n  ${DIM}Press any key to return to menu...${RESET}`;

    await updateSession(supabase, userId, { current_location: 'search:results' });
    return { screen, inputMode: 'key' };
  }

  // Any key from results goes back to main menu
  await updateSession(supabase, userId, { current_location: 'main_menu' });
  const recent = (session.recent_doors) || [];
  return showMainMenu(handle, recent);
}
