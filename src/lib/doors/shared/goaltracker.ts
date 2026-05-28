import type { Door } from '../base';
import type { BBSResponse, BBSSession, InputType } from '../../bbs/types';
import type { SupabaseClient } from '@supabase/supabase-js';
import { updateSession } from '../../bbs/session';
import { clear } from '../../ansi/screen';
import { theme, RESET, BOLD, DIM, FG } from '../../ansi/colors';
import { menu } from '../../ansi/menu';
import { sectionHeader } from '../../ansi/header';
import { padRight, truncate } from '../../ansi/text';
import { progressBar } from '../../ansi/progress';
import { box } from '../../ansi/box';

interface GoalConfig {
  id: string;
  name: string;
  category: string;
  description: string;
  goalType: string;
  itemLabel: string;
  hasTarget?: boolean;
}

export function createGoalDoor(config: GoalConfig): Door {
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
        case `${doorPrefix}:add:title`: return handleAddTitle(input, userId, session, supabase);
        case `${doorPrefix}:add:target`: return handleAddTarget(input, userId, session, supabase);
        case `${doorPrefix}:update:id`: return handleUpdateId(input, userId, session, supabase);
        case `${doorPrefix}:update:value`: return handleUpdateValue(input, userId, session, supabase);
        case `${doorPrefix}:complete`: return handleComplete(input, userId, session, supabase);
        case `${doorPrefix}:delete`: return handleDeleteGoal(input, userId, session, supabase);
        default: {
          if (loc.startsWith(`${doorPrefix}:list`)) return handleList(input, userId, session, supabase);
          return showMenu();
        }
      }
    },
  };

  function showMenu(): BBSResponse {
    const items = [
      { key: '1', label: `View ${config.itemLabel}s` },
      { key: '2', label: `Add ${config.itemLabel}` },
    ];
    if (config.hasTarget !== false) items.push({ key: '3', label: 'Update Progress' });
    items.push({ key: '4', label: `Complete ${config.itemLabel}` });
    items.push({ key: '5', label: `Delete ${config.itemLabel}` });
    items.push({ key: 'Q', label: 'Back' });

    return { screen: clear() + '\r\n' + menu({ title: config.name.toUpperCase(), items }), inputMode: 'key' };
  }

  async function handleMenu(input: string, inputType: InputType, userId: string, session: BBSSession, supabase: SupabaseClient): Promise<BBSResponse> {
    if (inputType === 'refresh') return showMenu();
    switch (input.toUpperCase()) {
      case '1': {
        await updateSession(supabase, userId, { current_location: `${doorPrefix}:list:1` });
        return showGoalList(userId, supabase, 1);
      }
      case '2': {
        await updateSession(supabase, userId, { current_location: `${doorPrefix}:add:title`, door_state: {} });
        return { screen: '', inputMode: 'line', prompt: `\r\n  ${theme.prompt}${config.itemLabel} title: ${RESET}` };
      }
      case '3': {
        if (config.hasTarget === false) return showMenu();
        await updateSession(supabase, userId, { current_location: `${doorPrefix}:update:id` });
        return { screen: '', inputMode: 'line', prompt: `\r\n  ${theme.prompt}${config.itemLabel} # to update: ${RESET}` };
      }
      case '4': {
        await updateSession(supabase, userId, { current_location: `${doorPrefix}:complete` });
        return { screen: '', inputMode: 'line', prompt: `\r\n  ${theme.prompt}# to mark complete: ${RESET}` };
      }
      case '5': {
        await updateSession(supabase, userId, { current_location: `${doorPrefix}:delete` });
        return { screen: '', inputMode: 'line', prompt: `\r\n  ${theme.prompt}# to delete: ${RESET}` };
      }
      default: return showMenu();
    }
  }

  async function showGoalList(userId: string, supabase: SupabaseClient, page: number): Promise<BBSResponse> {
    const pageSize = 10;
    const { data, count } = await supabase
      .from('goals')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .eq('goal_type', config.goalType)
      .order('status')
      .order('created_at', { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);

    const totalPages = Math.max(1, Math.ceil((count || 0) / pageSize));

    const rows: string[] = [''];
    if (!data || data.length === 0) {
      rows.push(`  ${DIM}No ${config.itemLabel.toLowerCase()}s yet.${RESET}`);
    } else {
      for (const g of data) {
        const status = g.status === 'completed'
          ? `${BOLD}${FG.green} DONE  ${RESET}`
          : `${FG.cyan} ACTIVE${RESET}`;
        let line = `  ${status}  ${BOLD}${padRight(truncate(g.title, 30), 30)}${RESET}`;
        if (config.hasTarget !== false && g.target_value) {
          line += `  ${progressBar(Number(g.current_value), Number(g.target_value), 12)}`;
        }
        line += `  ${DIM}#${g.id}${RESET}`;
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
    if (key === 'Q' || key === 'X') { await updateSession(supabase, userId, { current_location: doorPrefix }); return showMenu(); }
    if (key === 'N') page++;
    if (key === 'P' && page > 1) page--;
    await updateSession(supabase, userId, { current_location: `${doorPrefix}:list:${page}` });
    return showGoalList(userId, supabase, page);
  }

  async function handleAddTitle(input: string, userId: string, session: BBSSession, supabase: SupabaseClient): Promise<BBSResponse> {
    const title = input.trim();
    if (!title) { await updateSession(supabase, userId, { current_location: doorPrefix }); return showMenu(); }
    if (config.hasTarget !== false) {
      await updateSession(supabase, userId, { current_location: `${doorPrefix}:add:target`, door_state: { title } });
      return { screen: '', inputMode: 'line', prompt: `  ${theme.prompt}Target value (Enter to skip): ${RESET}` };
    }
    await supabase.from('goals').insert({ user_id: userId, goal_type: config.goalType, title });
    await updateSession(supabase, userId, { current_location: doorPrefix, door_state: {} });
    return { screen: `\r\n  ${theme.success}Added: ${BOLD}${title}${RESET}\r\n  ${DIM}Press any key...${RESET}`, inputMode: 'key' };
  }

  async function handleAddTarget(input: string, userId: string, session: BBSSession, supabase: SupabaseClient): Promise<BBSResponse> {
    const title = session.door_state.title as string;
    const target = parseFloat(input.trim()) || null;
    await supabase.from('goals').insert({ user_id: userId, goal_type: config.goalType, title, target_value: target });
    await updateSession(supabase, userId, { current_location: doorPrefix, door_state: {} });
    return { screen: `\r\n  ${theme.success}Added: ${BOLD}${title}${RESET}\r\n  ${DIM}Press any key...${RESET}`, inputMode: 'key' };
  }

  async function handleUpdateId(input: string, userId: string, session: BBSSession, supabase: SupabaseClient): Promise<BBSResponse> {
    const id = parseInt(input.trim());
    if (isNaN(id)) { await updateSession(supabase, userId, { current_location: doorPrefix }); return showMenu(); }
    await updateSession(supabase, userId, { current_location: `${doorPrefix}:update:value`, door_state: { goalId: id } });
    return { screen: '', inputMode: 'line', prompt: `  ${theme.prompt}New progress value: ${RESET}` };
  }

  async function handleUpdateValue(input: string, userId: string, session: BBSSession, supabase: SupabaseClient): Promise<BBSResponse> {
    const id = session.door_state.goalId as number;
    const val = parseFloat(input.trim());
    await updateSession(supabase, userId, { current_location: doorPrefix, door_state: {} });
    if (isNaN(val)) return { screen: `\r\n  ${theme.error}Invalid value${RESET}\r\n  ${DIM}Press any key...${RESET}`, inputMode: 'key' };
    await supabase.from('goals').update({ current_value: val }).eq('id', id).eq('user_id', userId);
    return { screen: `\r\n  ${theme.success}Progress updated!${RESET}\r\n  ${DIM}Press any key...${RESET}`, inputMode: 'key' };
  }

  async function handleComplete(input: string, userId: string, session: BBSSession, supabase: SupabaseClient): Promise<BBSResponse> {
    const id = parseInt(input.trim());
    await updateSession(supabase, userId, { current_location: doorPrefix });
    if (isNaN(id)) return showMenu();
    await supabase.from('goals').update({ status: 'completed' }).eq('id', id).eq('user_id', userId);
    return { screen: `\r\n  ${theme.success}#${id} completed!${RESET}\r\n  ${DIM}Press any key...${RESET}`, inputMode: 'key' };
  }

  async function handleDeleteGoal(input: string, userId: string, session: BBSSession, supabase: SupabaseClient): Promise<BBSResponse> {
    const id = parseInt(input.trim());
    await updateSession(supabase, userId, { current_location: doorPrefix });
    if (isNaN(id)) return showMenu();
    await supabase.from('goals').delete().eq('id', id).eq('user_id', userId);
    return { screen: `\r\n  ${theme.success}#${id} deleted.${RESET}\r\n  ${DIM}Press any key...${RESET}`, inputMode: 'key' };
  }
}
