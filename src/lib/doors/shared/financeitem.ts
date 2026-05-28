import type { Door } from '../base';
import type { BBSResponse, BBSSession, InputType } from '../../bbs/types';
import type { SupabaseClient } from '@supabase/supabase-js';
import { updateSession } from '../../bbs/session';
import { clear } from '../../ansi/screen';
import { theme, RESET, BOLD, DIM, FG } from '../../ansi/colors';
import { menu } from '../../ansi/menu';
import { sectionHeader } from '../../ansi/header';
import { padRight, truncate } from '../../ansi/text';
import { box } from '../../ansi/box';

interface FinanceConfig {
  id: string;
  name: string;
  category: string;
  description: string;
  itemType: string;
  itemLabel: string;
  hasDueDate?: boolean;
  hasFrequency?: boolean;
}

export function createFinanceDoor(config: FinanceConfig): Door {
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
        case doorPrefix: return handleMenu(input, inputType, userId, session, supabase);
        case `${doorPrefix}:add:name`: return handleAddName(input, userId, session, supabase);
        case `${doorPrefix}:add:amount`: return handleAddAmount(input, userId, session, supabase);
        case `${doorPrefix}:add:category`: return handleAddCategory(input, userId, session, supabase);
        case `${doorPrefix}:toggle`: return handleToggle(input, userId, session, supabase);
        case `${doorPrefix}:delete`: return handleDeleteItem(input, userId, session, supabase);
        default: {
          if (loc.startsWith(`${doorPrefix}:list`)) return handleList(input, userId, session, supabase);
          return showMenu(userId, supabase);
        }
      }
    },
  };

  async function showMenu(userId: string, supabase: SupabaseClient): Promise<BBSResponse> {
    const { data } = await supabase
      .from('finance_items')
      .select('amount, paid')
      .eq('user_id', userId)
      .eq('item_type', config.itemType);

    const total = (data || []).reduce((s, r) => s + Number(r.amount), 0);
    const paid = (data || []).filter(r => r.paid).reduce((s, r) => s + Number(r.amount), 0);

    let screen = clear() + '\r\n';
    if (data && data.length > 0) {
      screen += `  ${theme.info}Total:${RESET} ${BOLD}$${total.toFixed(2)}${RESET}`;
      if (config.hasDueDate) screen += `  ${theme.info}Paid:${RESET} ${BOLD}${FG.green}$${paid.toFixed(2)}${RESET}`;
      screen += '\r\n\r\n';
    }

    const items = [
      { key: '1', label: `View ${config.itemLabel}s` },
      { key: '2', label: `Add ${config.itemLabel}` },
    ];
    if (config.hasDueDate) items.push({ key: '3', label: 'Toggle Paid' });
    items.push({ key: '4', label: `Delete ${config.itemLabel}` });
    items.push({ key: 'Q', label: 'Back' });

    screen += menu({ title: config.name.toUpperCase(), items });
    return { screen, inputMode: 'key' };
  }

  async function handleMenu(input: string, inputType: InputType, userId: string, session: BBSSession, supabase: SupabaseClient): Promise<BBSResponse> {
    if (inputType === 'refresh') return showMenu(userId, supabase);
    switch (input.toUpperCase()) {
      case '1': {
        await updateSession(supabase, userId, { current_location: `${doorPrefix}:list:1` });
        return showItemList(userId, supabase, 1);
      }
      case '2': {
        await updateSession(supabase, userId, { current_location: `${doorPrefix}:add:name`, door_state: {} });
        return { screen: '', inputMode: 'line', prompt: `\r\n  ${theme.prompt}${config.itemLabel} name: ${RESET}` };
      }
      case '3': {
        if (!config.hasDueDate) return showMenu(userId, supabase);
        await updateSession(supabase, userId, { current_location: `${doorPrefix}:toggle` });
        return { screen: '', inputMode: 'line', prompt: `\r\n  ${theme.prompt}# to toggle paid: ${RESET}` };
      }
      case '4': {
        await updateSession(supabase, userId, { current_location: `${doorPrefix}:delete` });
        return { screen: '', inputMode: 'line', prompt: `\r\n  ${theme.prompt}# to delete: ${RESET}` };
      }
      default: return showMenu(userId, supabase);
    }
  }

  async function showItemList(userId: string, supabase: SupabaseClient, page: number): Promise<BBSResponse> {
    const pageSize = 10;
    const { data, count } = await supabase
      .from('finance_items')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .eq('item_type', config.itemType)
      .order('created_at', { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);

    const totalPages = Math.max(1, Math.ceil((count || 0) / pageSize));

    const rows: string[] = [''];
    if (!data || data.length === 0) {
      rows.push(`  ${DIM}No ${config.itemLabel.toLowerCase()}s yet.${RESET}`);
    } else {
      // Header row
      let header = `  ${BOLD}`;
      if (config.hasDueDate) header += padRight('Status', 8);
      header += padRight('Amount', 12) + padRight('Name', 26) + padRight('Category', 14) + 'ID';
      header += RESET;
      rows.push(header);
      rows.push(`  ${theme.border}${'─'.repeat(62)}${RESET}`);

      for (const item of data) {
        let line = '  ';
        if (config.hasDueDate) {
          line += item.paid
            ? `${BOLD}${FG.green}PAID  ${RESET}  `
            : `${FG.red}DUE   ${RESET}  `;
        }
        const amt = `$${Number(item.amount).toFixed(2)}`;
        line += `${BOLD}${padRight(amt, 12)}${RESET}`;
        line += `${padRight(truncate(item.name, 24), 26)}`;
        if (item.category) line += `${FG.yellow}${padRight(item.category, 14)}${RESET}`;
        else line += padRight('', 14);
        line += `${DIM}#${item.id}${RESET}`;
        rows.push(line);
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

    screen += `\r\n  ${DIM}Page ${page}/${totalPages}  |  ${count || 0} items${RESET}`;
    if (totalPages > 1) screen += `  ${DIM}[N]ext [P]rev${RESET}`;
    screen += `  ${DIM}[Q] Back${RESET}`;
    return { screen, inputMode: 'key' };
  }

  async function handleList(input: string, userId: string, session: BBSSession, supabase: SupabaseClient): Promise<BBSResponse> {
    const parts = session.current_location.split(':');
    let page = parseInt(parts[3] || '1');
    const key = input.toUpperCase();
    if (key === 'Q' || key === 'X') { await updateSession(supabase, userId, { current_location: doorPrefix }); return showMenu(userId, supabase); }
    if (key === 'N') page++;
    if (key === 'P' && page > 1) page--;
    await updateSession(supabase, userId, { current_location: `${doorPrefix}:list:${page}` });
    return showItemList(userId, supabase, page);
  }

  async function handleAddName(input: string, userId: string, session: BBSSession, supabase: SupabaseClient): Promise<BBSResponse> {
    const name = input.trim();
    if (!name) { await updateSession(supabase, userId, { current_location: doorPrefix }); return showMenu(userId, supabase); }
    await updateSession(supabase, userId, { current_location: `${doorPrefix}:add:amount`, door_state: { name } });
    return { screen: '', inputMode: 'line', prompt: `  ${theme.prompt}Amount ($): ${RESET}` };
  }

  async function handleAddAmount(input: string, userId: string, session: BBSSession, supabase: SupabaseClient): Promise<BBSResponse> {
    const amount = parseFloat(input.trim().replace('$', ''));
    if (isNaN(amount)) { await updateSession(supabase, userId, { current_location: doorPrefix }); return showMenu(userId, supabase); }
    await updateSession(supabase, userId, {
      current_location: `${doorPrefix}:add:category`,
      door_state: { ...session.door_state, amount },
    });
    return { screen: '', inputMode: 'line', prompt: `  ${theme.prompt}Category (Enter to skip): ${RESET}` };
  }

  async function handleAddCategory(input: string, userId: string, session: BBSSession, supabase: SupabaseClient): Promise<BBSResponse> {
    const name = session.door_state.name as string;
    const amount = session.door_state.amount as number;
    await supabase.from('finance_items').insert({
      user_id: userId, item_type: config.itemType, name, amount, category: input.trim(),
    });
    await updateSession(supabase, userId, { current_location: doorPrefix, door_state: {} });
    return { screen: `\r\n  ${theme.success}Added: ${BOLD}${name} ($${amount.toFixed(2)})${RESET}\r\n  ${DIM}Press any key...${RESET}`, inputMode: 'key' };
  }

  async function handleToggle(input: string, userId: string, session: BBSSession, supabase: SupabaseClient): Promise<BBSResponse> {
    const id = parseInt(input.trim());
    await updateSession(supabase, userId, { current_location: doorPrefix });
    if (isNaN(id)) return showMenu(userId, supabase);
    const { data } = await supabase.from('finance_items').select('paid').eq('id', id).eq('user_id', userId).single();
    if (!data) return { screen: `\r\n  ${theme.error}Not found${RESET}\r\n  ${DIM}Press any key...${RESET}`, inputMode: 'key' };
    await supabase.from('finance_items').update({ paid: !data.paid }).eq('id', id).eq('user_id', userId);
    return { screen: `\r\n  ${theme.success}#${id} ${data.paid ? 'marked unpaid' : 'marked paid'}!${RESET}\r\n  ${DIM}Press any key...${RESET}`, inputMode: 'key' };
  }

  async function handleDeleteItem(input: string, userId: string, session: BBSSession, supabase: SupabaseClient): Promise<BBSResponse> {
    const id = parseInt(input.trim());
    await updateSession(supabase, userId, { current_location: doorPrefix });
    if (isNaN(id)) return showMenu(userId, supabase);
    await supabase.from('finance_items').delete().eq('id', id).eq('user_id', userId);
    return { screen: `\r\n  ${theme.success}#${id} deleted.${RESET}\r\n  ${DIM}Press any key...${RESET}`, inputMode: 'key' };
  }
}
