import type { Door } from '../base';
import type { BBSResponse, BBSSession, InputType } from '../../bbs/types';
import type { SupabaseClient } from '@supabase/supabase-js';
import { updateSession } from '../../bbs/session';
import { clear } from '../../ansi/screen';
import { theme, RESET, BOLD, DIM, FG } from '../../ansi/colors';
import { menu } from '../../ansi/menu';
import { sectionHeader } from '../../ansi/header';
import { padRight } from '../../ansi/text';
import { progressBar } from '../../ansi/progress';

interface TrackerConfig {
  id: string;
  name: string;
  category: string;
  description: string;
  trackerType: string;
  unit: string;
  labels?: string[];
  valuePrompt: string;
  showChart?: boolean;
}

export function createTrackerDoor(config: TrackerConfig): Door {
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
        case `${doorPrefix}:log`:
          return handleLog(input, userId, session, supabase);
        case `${doorPrefix}:log:note`:
          return handleLogNote(input, userId, session, supabase);
        default: {
          if (loc.startsWith(`${doorPrefix}:history`))
            return handleHistory(input, userId, session, supabase);
          return showMenu(userId, supabase);
        }
      }
    },
  };

  async function showMenu(userId: string, supabase: SupabaseClient): Promise<BBSResponse> {
    const today = new Date().toISOString().split('T')[0];
    const { data: todayEntry } = await supabase
      .from('daily_trackers')
      .select('*')
      .eq('user_id', userId)
      .eq('tracker_type', config.trackerType)
      .eq('entry_date', today)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    let screen = clear() + '\r\n';
    if (todayEntry) {
      const val = config.labels ? config.labels[Math.round(Number(todayEntry.value))] || todayEntry.value : todayEntry.value;
      screen += `  ${theme.info}Today:${RESET} ${BOLD}${val} ${config.unit}${RESET}`;
      if (todayEntry.note) screen += `  ${DIM}(${todayEntry.note})${RESET}`;
      screen += '\r\n\r\n';
    }

    screen += menu({
      title: config.name.toUpperCase(),
      items: [
        { key: '1', label: `Log ${config.name}` },
        { key: '2', label: 'View History' },
        { key: 'Q', label: 'Back' },
      ],
    });

    return { screen, inputMode: 'key' };
  }

  async function handleMenu(input: string, inputType: InputType, userId: string, session: BBSSession, supabase: SupabaseClient): Promise<BBSResponse> {
    if (inputType === 'refresh') return showMenu(userId, supabase);
    switch (input.toUpperCase()) {
      case '1': {
        await updateSession(supabase, userId, { current_location: `${doorPrefix}:log`, door_state: {} });
        let prompt = `\r\n  ${theme.prompt}${config.valuePrompt}: ${RESET}`;
        if (config.labels) {
          prompt = '\r\n' + config.labels.map((l, i) => `  ${BOLD}[${i}]${RESET} ${l}`).join('\r\n') + '\r\n' + prompt;
        }
        return { screen: '', inputMode: 'line', prompt };
      }
      case '2': {
        await updateSession(supabase, userId, { current_location: `${doorPrefix}:history:1` });
        return showHistory(userId, supabase, 1);
      }
      default:
        return showMenu(userId, supabase);
    }
  }

  async function handleLog(input: string, userId: string, session: BBSSession, supabase: SupabaseClient): Promise<BBSResponse> {
    const val = parseFloat(input.trim());
    if (isNaN(val)) {
      await updateSession(supabase, userId, { current_location: doorPrefix });
      return { screen: `\r\n  ${theme.error}Invalid value${RESET}\r\n  ${DIM}Press any key...${RESET}`, inputMode: 'key' };
    }
    await updateSession(supabase, userId, {
      current_location: `${doorPrefix}:log:note`,
      door_state: { value: val },
    });
    return { screen: '', inputMode: 'line', prompt: `  ${theme.prompt}Note (Enter to skip): ${RESET}` };
  }

  async function handleLogNote(input: string, userId: string, session: BBSSession, supabase: SupabaseClient): Promise<BBSResponse> {
    const value = session.door_state.value as number;
    await supabase.from('daily_trackers').insert({
      user_id: userId,
      tracker_type: config.trackerType,
      value,
      note: input.trim(),
    });
    await updateSession(supabase, userId, { current_location: doorPrefix, door_state: {} });
    const display = config.labels ? config.labels[Math.round(value)] || value : value;
    return {
      screen: `\r\n  ${theme.success}Logged: ${BOLD}${display} ${config.unit}${RESET}\r\n  ${DIM}Press any key...${RESET}`,
      inputMode: 'key',
    };
  }

  async function showHistory(userId: string, supabase: SupabaseClient, page: number): Promise<BBSResponse> {
    const pageSize = 14;
    const { data, count } = await supabase
      .from('daily_trackers')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .eq('tracker_type', config.trackerType)
      .order('entry_date', { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);

    const totalPages = Math.max(1, Math.ceil((count || 0) / pageSize));
    let screen = clear() + `\r\n${sectionHeader(`${config.name} HISTORY`)}\r\n\r\n`;

    if (!data || data.length === 0) {
      screen += `  ${DIM}No entries yet.${RESET}\r\n`;
    } else {
      for (const row of data) {
        const date = new Date(row.entry_date).toLocaleDateString();
        const val = config.labels ? config.labels[Math.round(Number(row.value))] || row.value : row.value;
        screen += `  ${FG.cyan}${date}${RESET}  ${BOLD}${padRight(String(val), 12)}${RESET} ${config.unit}`;
        if (row.note) screen += `  ${DIM}${row.note}${RESET}`;
        screen += '\r\n';
      }
    }

    screen += `\r\n  ${DIM}Page ${page}/${totalPages}${RESET}`;
    if (totalPages > 1) screen += `  ${DIM}[N]ext [P]rev${RESET}`;
    screen += `  ${DIM}[Q] Back${RESET}`;
    return { screen, inputMode: 'key' };
  }

  async function handleHistory(input: string, userId: string, session: BBSSession, supabase: SupabaseClient): Promise<BBSResponse> {
    const parts = session.current_location.split(':');
    let page = parseInt(parts[3] || '1');
    const key = input.toUpperCase();
    if (key === 'Q' || key === 'X') {
      await updateSession(supabase, userId, { current_location: doorPrefix });
      return showMenu(userId, supabase);
    }
    if (key === 'N') page++;
    if (key === 'P' && page > 1) page--;
    await updateSession(supabase, userId, { current_location: `${doorPrefix}:history:${page}` });
    return showHistory(userId, supabase, page);
  }
}
