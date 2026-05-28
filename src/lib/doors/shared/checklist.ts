import type { Door } from '../base';
import type { BBSResponse, BBSSession, InputType } from '../../bbs/types';
import type { SupabaseClient } from '@supabase/supabase-js';
import { updateSession } from '../../bbs/session';
import { clear } from '../../ansi/screen';
import { theme, RESET, BOLD, DIM, FG } from '../../ansi/colors';
import { menu } from '../../ansi/menu';
import { padRight, truncate } from '../../ansi/text';
import { box } from '../../ansi/box';

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
          return showMenu(userId, supabase);
        }
      }
    },
  };

  async function showMenu(userId: string, supabase: SupabaseClient): Promise<BBSResponse> {
    const { count: total } = await supabase
      .from('checklists')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('list_type', config.listType);
    const { count: done } = await supabase
      .from('checklists')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('list_type', config.listType)
      .eq('completed', true);

    let screen = clear() + '\r\n';

    if (total && total > 0) {
      const summaryLines = [
        '',
        `  ${theme.info}Total:${RESET}     ${BOLD}${total}${RESET} items`,
        `  ${theme.info}Done:${RESET}      ${BOLD}${FG.green}${done || 0}${RESET}`,
        `  ${theme.info}Remaining:${RESET} ${BOLD}${(total || 0) - (done || 0)}${RESET}`,
        '',
      ];
      screen += box(summaryLines, {
        style: 'single',
        width: 36,
        borderColor: theme.border,
        title: 'SUMMARY',
        titleColor: theme.title,
      });
      screen += '\r\n';
    }

    screen += menu({
      title: config.name.toUpperCase(),
      items: [
        { key: '1', label: `View ${config.name}` },
        { key: '2', label: `Add ${config.itemLabel}` },
        { key: '3', label: `Check Off ${config.itemLabel}` },
        { key: '4', label: `Remove ${config.itemLabel}` },
        { key: 'Q', label: 'Back' },
      ],
    });
    return { screen, inputMode: 'key' };
  }

  async function handleMenu(input: string, inputType: InputType, userId: string, session: BBSSession, supabase: SupabaseClient): Promise<BBSResponse> {
    if (inputType === 'refresh') return showMenu(userId, supabase);
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
      default: return showMenu(userId, supabase);
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

    const rows: string[] = [''];
    if (!data || data.length === 0) {
      rows.push(`  ${DIM}Your list is empty.${RESET}`);
      rows.push('');
      rows.push(`  ${theme.prompt}Press [A] to add your first ${config.itemLabel.toLowerCase()}!${RESET}`);
    } else {
      for (const item of data) {
        const check = item.completed
          ? `${BOLD}${FG.green}[x]${RESET}`
          : `${FG.white}[ ]${RESET}`;
        const title = item.completed
          ? `${DIM}${item.title}${RESET}`
          : `${FG.white}${item.title}${RESET}`;
        rows.push(`  ${check}  ${padRight(truncate(title, 48), 48)}  ${DIM}#${item.id}${RESET}`);
      }
    }
    rows.push('');

    let screen = clear() + '\r\n';
    screen += box(rows, {
      style: 'single',
      width: 66,
      borderColor: theme.border,
      title: config.name.toUpperCase(),
      titleColor: theme.title,
    });

    screen += `\r\n  ${DIM}Page ${page}/${totalPages}  |  ${count || 0} items${RESET}`;
    if (totalPages > 1) screen += `  ${DIM}[N]ext [P]rev${RESET}`;
    screen += `  ${DIM}[A]dd  [C]heck  [D]elete  [Q] Back${RESET}`;
    return { screen, inputMode: 'key' };
  }

  async function handleList(input: string, userId: string, session: BBSSession, supabase: SupabaseClient): Promise<BBSResponse> {
    const parts = session.current_location.split(':');
    let page = parseInt(parts[3] || '1');
    const key = input.toUpperCase();
    if (key === 'A') {
      await updateSession(supabase, userId, { current_location: `${doorPrefix}:add` });
      return { screen: '', inputMode: 'line', prompt: `\r\n  ${theme.prompt}${config.itemLabel} name: ${RESET}` };
    }
    if (key === 'C') {
      await updateSession(supabase, userId, { current_location: `${doorPrefix}:check` });
      return { screen: '', inputMode: 'line', prompt: `\r\n  ${theme.prompt}# to check off: ${RESET}` };
    }
    if (key === 'D') {
      await updateSession(supabase, userId, { current_location: `${doorPrefix}:delete` });
      return { screen: '', inputMode: 'line', prompt: `\r\n  ${theme.prompt}# to remove: ${RESET}` };
    }
    if (key === 'Q' || key === 'X') {
      await updateSession(supabase, userId, { current_location: doorPrefix });
      return showMenu(userId, supabase);
    }
    if (key === 'N') page++;
    if (key === 'P' && page > 1) page--;
    await updateSession(supabase, userId, { current_location: `${doorPrefix}:list:${page}` });
    return showList(userId, supabase, page);
  }

  async function handleAdd(input: string, userId: string, session: BBSSession, supabase: SupabaseClient): Promise<BBSResponse> {
    const title = input.trim();
    await updateSession(supabase, userId, { current_location: doorPrefix });
    if (!title) return showMenu(userId, supabase);
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
