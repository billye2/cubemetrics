import type { Door } from '../base';
import type { BBSResponse, BBSSession, InputType } from '../../bbs/types';
import type { SupabaseClient } from '@supabase/supabase-js';
import { updateSession } from '../../bbs/session';
import { clear } from '../../ansi/screen';
import { theme, RESET, BOLD, DIM, FG } from '../../ansi/colors';
import { menu } from '../../ansi/menu';
import { truncate, padRight, wordWrap } from '../../ansi/text';
import { box } from '../../ansi/box';

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
    const pageSize = 10;
    const { data, count } = await supabase
      .from('logs')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .eq('log_type', config.logType)
      .order('entry_date', { ascending: false })
      .order('created_at', { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);

    const totalPages = Math.max(1, Math.ceil((count || 0) / pageSize));

    const rows: string[] = [''];
    if (!data || data.length === 0) {
      rows.push(`  ${DIM}No entries yet. Start writing!${RESET}`);
    } else {
      rows.push(`  ${BOLD}${padRight('Date', 14)}${padRight('Title / Preview', 42)}ID${RESET}`);
      rows.push(`  ${theme.border}${'─'.repeat(62)}${RESET}`);
      for (const entry of data) {
        const date = new Date(entry.entry_date).toLocaleDateString();
        const title = entry.title || truncate(entry.body, 40);
        rows.push(`  ${FG.cyan}${padRight(date, 14)}${RESET}${padRight(truncate(title, 40), 42)}${DIM}#${entry.id}${RESET}`);
      }
    }
    rows.push('');

    let screen = clear() + '\r\n';
    screen += box(rows, {
      style: 'single',
      width: 70,
      borderColor: theme.border,
      title: config.name.toUpperCase(),
      titleColor: theme.title,
    });

    screen += `\r\n  ${DIM}Enter # to read  |  Page ${page}/${totalPages}${RESET}`;
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

    const num = parseInt(input);
    if (!isNaN(num)) {
      const { data } = await supabase.from('logs').select('*').eq('id', num).eq('user_id', userId).single();
      if (data) {
        await updateSession(supabase, userId, { current_location: `${doorPrefix}:view:${num}` });
        return showEntry(data);
      }
    }

    await updateSession(supabase, userId, { current_location: `${doorPrefix}:list:${page}` });
    return showList(userId, supabase, page);
  }

  function showEntry(data: Record<string, unknown>): BBSResponse {
    const date = new Date(data.entry_date as string).toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });

    const contentLines: string[] = [''];
    if (data.title) {
      contentLines.push(`  ${BOLD}${FG.yellow}${data.title}${RESET}`);
    }
    contentLines.push(`  ${DIM}${date}${RESET}`);
    contentLines.push(`  ${theme.border}${'─'.repeat(56)}${RESET}`);
    contentLines.push('');

    const body = data.body as string;
    for (const paragraph of body.split('\n')) {
      const wrapped = wordWrap(paragraph, 56);
      for (const line of wrapped) {
        contentLines.push(`  ${FG.white}${line}${RESET}`);
      }
    }
    contentLines.push('');

    let screen = clear() + '\r\n';
    screen += box(contentLines, {
      style: 'double',
      width: 64,
      borderColor: theme.border,
      title: config.entryLabel.toUpperCase(),
      titleColor: theme.title,
    });
    screen += `\r\n  ${DIM}Press any key to go back${RESET}`;
    return { screen, inputMode: 'key' };
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
