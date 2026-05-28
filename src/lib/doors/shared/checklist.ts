import type { Door } from '../base';
import type { BBSResponse, BBSSession, InputType } from '../../bbs/types';
import type { SupabaseClient } from '@supabase/supabase-js';
import { updateSession } from '../../bbs/session';
import { clear } from '../../ansi/screen';
import { theme, RESET, BOLD, DIM, FG } from '../../ansi/colors';
import { menu } from '../../ansi/menu';
import { sectionHeader } from '../../ansi/header';
import { padRight, truncate } from '../../ansi/text';

interface ChecklistConfig {
  id: string;
  name: string;
  category: string;
  description: string;
  listType: string;
  itemLabel: string;
}

export function createChecklistDoor(config: ChecklistConfig): Door {
  const doorPrefix = `door:${config.id}`;

  return {
    id: config.id,
    name: config.name,
    category: config.category,
    description: config.description,
    version: '1.0',

    async handle(input, inputType, userId, session, supabase) {
      const loc = session.current_location;
      switch (loc) {
        case doorPrefix:
          return handleMenu(input, inputType, userId, session, supabase);
        case `${doorPrefix}:add`:
          return handleAdd(input, userId, session, supabase);
        case `${doorPrefix}:check`:
          return handleCheck(input, userId, session, supabase);
        case `${doorPrefix}:delete`:
          return handleDelete(input, userId, session, supabase);
        default: {
          if (loc.startsWith(`${doorPrefix}:list`))
            return handleList(input, userId, session, supabase);
          return showMenu();
        }
      }
    },
  };

  function showMenu(): BBSResponse {
    return {
      screen: clear() + '\r\n' + menu({
        title: config.name.toUpperCase(),
        items: [
          { key: '1', label: `View ${config.name}` },
          { key: '2', label: `Add ${config.itemLabel}` },
          { key: '3', label: `Check Off ${config.itemLabel}` },
          { key: '4', label: `Remove ${config.itemLabel}` },
          { key: 'Q', label: 'Back' },
        ],
      }),
      inputMode: 'key',
    };
  }

  async function handleMenu(input: string, inputType: InputType, userId: string, session: BBSSession, supabase: SupabaseClient): Promise<BBSResponse> {
    if (inputType === 'refresh') return showMenu();
    switch (input.toUpperCase()) {
      case '1': {
        await updateSession(supabase, userId, { current_location: `${doorPrefix}:list:1` });
        return showList(userId, supabase, 1);
      }
      case '2': {
        await updateSession(supabase, userId, { current_location: `${doorPrefix}:add` });
        return { screen: '', inputMode: 'line', prompt: `\r\n  ${theme.prompt}${config.itemLabel} name: ${RESET}` };
      }
      case '3': {
        await updateSession(supabase, userId, { current_location: `${doorPrefix}:check` });
        return { screen: '', inputMode: 'line', prompt: `\r\n  ${theme.prompt}# to check off: ${RESET}` };
      }
      case '4': {
        await updateSession(supabase, userId, { current_location: `${doorPrefix}:delete` });
        return { screen: '', inputMode: 'line', prompt: `\r\n  ${theme.prompt}# to remove: ${RESET}` };
      }
      default: return showMenu();
    }
  }

  async function showList(userId: string, supabase: SupabaseClient, page: number): Promise<BBSResponse> {
    const pageSize = 12;
    const { data, count } = await supabase
      .from('checklists')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .eq('list_type', config.listType)
      .order('completed')
      .order('sort_order')
      .order('created_at', { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);

    const totalPages = Math.max(1, Math.ceil((count || 0) / pageSize));
    let screen = clear() + `\r\n${sectionHeader(config.name)}\r\n\r\n`;

    if (!data || data.length === 0) {
      screen += `  ${DIM}Empty list.${RESET}\r\n`;
    } else {
      for (const item of data) {
        const check = item.completed ? `${BOLD}${FG.green}[x]${RESET}` : `${DIM}[ ]${RESET}`;
        const title = item.completed ? `${DIM}${item.title}${RESET}` : `${FG.white}${item.title}${RESET}`;
        screen += `  ${check} ${padRight(truncate(title, 55), 55)} ${DIM}#${item.id}${RESET}\r\n`;
      }
    }

    screen += `\r\n  ${DIM}Page ${page}/${totalPages}  |  ${count || 0} items${RESET}`;
    if (totalPages > 1) screen += `  ${DIM}[N]ext [P]rev${RESET}`;
    screen += `  ${DIM}[Q] Back${RESET}`;
    return { screen, inputMode: 'key' };
  }

  async function handleList(input: string, userId: string, session: BBSSession, supabase: SupabaseClient): Promise<BBSResponse> {
    const parts = session.current_location.split(':');
    let page = parseInt(parts[3] || '1');
    const key = input.toUpperCase();
    if (key === 'Q' || key === 'X') {
      await updateSession(supabase, userId, { current_location: doorPrefix });
      return showMenu();
    }
    if (key === 'N') page++;
    if (key === 'P' && page > 1) page--;
    await updateSession(supabase, userId, { current_location: `${doorPrefix}:list:${page}` });
    return showList(userId, supabase, page);
  }

  async function handleAdd(input: string, userId: string, session: BBSSession, supabase: SupabaseClient): Promise<BBSResponse> {
    const title = input.trim();
    await updateSession(supabase, userId, { current_location: doorPrefix });
    if (!title) return showMenu();
    await supabase.from('checklists').insert({ user_id: userId, list_type: config.listType, title });
    return {
      screen: `\r\n  ${theme.success}Added: ${BOLD}${title}${RESET}\r\n  ${DIM}Press any key...${RESET}`,
      inputMode: 'key',
    };
  }

  async function handleCheck(input: string, userId: string, session: BBSSession, supabase: SupabaseClient): Promise<BBSResponse> {
    const id = parseInt(input.trim());
    await updateSession(supabase, userId, { current_location: doorPrefix });
    if (isNaN(id)) return { screen: `\r\n  ${theme.error}Invalid number${RESET}\r\n  ${DIM}Press any key...${RESET}`, inputMode: 'key' };
    const { data } = await supabase.from('checklists').select('completed').eq('id', id).eq('user_id', userId).single();
    if (!data) return { screen: `\r\n  ${theme.error}Not found${RESET}\r\n  ${DIM}Press any key...${RESET}`, inputMode: 'key' };
    await supabase.from('checklists').update({ completed: !data.completed }).eq('id', id).eq('user_id', userId);
    return {
      screen: `\r\n  ${theme.success}Item #${id} ${data.completed ? 'unchecked' : 'checked off'}!${RESET}\r\n  ${DIM}Press any key...${RESET}`,
      inputMode: 'key',
    };
  }

  async function handleDelete(input: string, userId: string, session: BBSSession, supabase: SupabaseClient): Promise<BBSResponse> {
    const id = parseInt(input.trim());
    await updateSession(supabase, userId, { current_location: doorPrefix });
    if (isNaN(id)) return { screen: `\r\n  ${theme.error}Invalid number${RESET}\r\n  ${DIM}Press any key...${RESET}`, inputMode: 'key' };
    await supabase.from('checklists').delete().eq('id', id).eq('user_id', userId);
    return {
      screen: `\r\n  ${theme.success}Item #${id} removed.${RESET}\r\n  ${DIM}Press any key...${RESET}`,
      inputMode: 'key',
    };
  }
}
