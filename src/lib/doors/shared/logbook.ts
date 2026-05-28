import type { Door } from '../base';
import type { BBSResponse, BBSSession, InputType } from '../../bbs/types';
import type { SupabaseClient } from '@supabase/supabase-js';
import { updateSession } from '../../bbs/session';
import { clear } from '../../ansi/screen';
import { theme, RESET, BOLD, DIM, FG } from '../../ansi/colors';
import { menu } from '../../ansi/menu';
import { sectionHeader } from '../../ansi/header';
import { truncate } from '../../ansi/text';
import { horizontalLine } from '../../ansi/box';

interface LogbookConfig {
  id: string;
  name: string;
  category: string;
  description: string;
  logType: string;
  entryLabel: string;
  hasTitle?: boolean;
}

export function createLogbookDoor(config: LogbookConfig): Door {
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
        case `${doorPrefix}:write:title`:
          return handleWriteTitle(input, userId, session, supabase);
        case `${doorPrefix}:write:body`:
          return handleWriteBody(input, userId, session, supabase);
        case `${doorPrefix}:delete`:
          return handleDeleteEntry(input, userId, session, supabase);
        default: {
          if (loc.startsWith(`${doorPrefix}:list`)) return handleList(input, userId, session, supabase);
          if (loc.startsWith(`${doorPrefix}:view:`)) return handleView(input, userId, session, supabase);
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
          { key: '1', label: `Browse ${config.entryLabel}s` },
          { key: '2', label: `Write ${config.entryLabel}` },
          { key: '3', label: `Delete ${config.entryLabel}` },
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
        if (config.hasTitle !== false) {
          await updateSession(supabase, userId, { current_location: `${doorPrefix}:write:title`, door_state: {} });
          return { screen: '', inputMode: 'line', prompt: `\r\n  ${theme.prompt}Title (Enter to skip): ${RESET}` };
        }
        await updateSession(supabase, userId, { current_location: `${doorPrefix}:write:body`, door_state: {} });
        return { screen: '', inputMode: 'line', prompt: `\r\n  ${theme.prompt}${config.entryLabel}: ${RESET}` };
      }
      case '3': {
        await updateSession(supabase, userId, { current_location: `${doorPrefix}:delete` });
        return { screen: '', inputMode: 'line', prompt: `\r\n  ${theme.prompt}# to delete: ${RESET}` };
      }
      default: return showMenu();
    }
  }

  async function showList(userId: string, supabase: SupabaseClient, page: number): Promise<BBSResponse> {
    const pageSize = 12;
    const { data, count } = await supabase
      .from('logs')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .eq('log_type', config.logType)
      .order('entry_date', { ascending: false })
      .order('created_at', { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);

    const totalPages = Math.max(1, Math.ceil((count || 0) / pageSize));
    let screen = clear() + `\r\n${sectionHeader(config.name)}\r\n\r\n`;

    if (!data || data.length === 0) {
      screen += `  ${DIM}No entries yet.${RESET}\r\n`;
    } else {
      for (const entry of data) {
        const date = new Date(entry.entry_date).toLocaleDateString();
        const title = entry.title || truncate(entry.body, 45);
        screen += `  ${FG.cyan}${date}${RESET}  ${BOLD}${truncate(title, 50)}${RESET}  ${DIM}#${entry.id}${RESET}\r\n`;
      }
    }

    screen += `\r\n  ${DIM}Page ${page}/${totalPages}  |  Enter # to read  |  ${RESET}`;
    if (totalPages > 1) screen += `${DIM}[N]ext [P]rev  |  ${RESET}`;
    screen += `${DIM}[Q] Back${RESET}`;
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

    const num = parseInt(input);
    if (!isNaN(num)) {
      const { data } = await supabase.from('logs').select('*').eq('id', num).eq('user_id', userId).single();
      if (data) {
        await updateSession(supabase, userId, { current_location: `${doorPrefix}:view:${num}` });
        let screen = clear() + '\r\n';
        if (data.title) screen += `  ${BOLD}${FG.yellow}${data.title}${RESET}\r\n`;
        screen += `  ${DIM}${new Date(data.entry_date).toLocaleDateString()}${RESET}\r\n`;
        screen += `  ${theme.border}${horizontalLine({ width: 60 })}${RESET}\r\n\r\n`;
        for (const line of data.body.split('\n')) {
          screen += `  ${FG.white}${line}${RESET}\r\n`;
        }
        screen += `\r\n  ${DIM}Press any key to go back${RESET}`;
        return { screen, inputMode: 'key' };
      }
    }

    await updateSession(supabase, userId, { current_location: `${doorPrefix}:list:${page}` });
    return showList(userId, supabase, page);
  }

  async function handleView(input: string, userId: string, session: BBSSession, supabase: SupabaseClient): Promise<BBSResponse> {
    await updateSession(supabase, userId, { current_location: `${doorPrefix}:list:1` });
    return showList(userId, supabase, 1);
  }

  async function handleWriteTitle(input: string, userId: string, session: BBSSession, supabase: SupabaseClient): Promise<BBSResponse> {
    await updateSession(supabase, userId, {
      current_location: `${doorPrefix}:write:body`,
      door_state: { title: input.trim() },
    });
    return { screen: '', inputMode: 'line', prompt: `  ${theme.prompt}${config.entryLabel}: ${RESET}` };
  }

  async function handleWriteBody(input: string, userId: string, session: BBSSession, supabase: SupabaseClient): Promise<BBSResponse> {
    const body = input.trim();
    await updateSession(supabase, userId, { current_location: doorPrefix, door_state: {} });
    if (!body) return showMenu();
    const title = (session.door_state.title as string) || '';
    await supabase.from('logs').insert({ user_id: userId, log_type: config.logType, title, body });
    return {
      screen: `\r\n  ${theme.success}${config.entryLabel} saved!${RESET}\r\n  ${DIM}Press any key...${RESET}`,
      inputMode: 'key',
    };
  }

  async function handleDeleteEntry(input: string, userId: string, session: BBSSession, supabase: SupabaseClient): Promise<BBSResponse> {
    const id = parseInt(input.trim());
    await updateSession(supabase, userId, { current_location: doorPrefix });
    if (isNaN(id)) return { screen: `\r\n  ${theme.error}Invalid number${RESET}\r\n  ${DIM}Press any key...${RESET}`, inputMode: 'key' };
    await supabase.from('logs').delete().eq('id', id).eq('user_id', userId).eq('log_type', config.logType);
    return {
      screen: `\r\n  ${theme.success}Entry #${id} deleted.${RESET}\r\n  ${DIM}Press any key...${RESET}`,
      inputMode: 'key',
    };
  }
}
