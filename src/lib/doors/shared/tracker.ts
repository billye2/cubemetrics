import type { Door } from '../base';
import type { BBSResponse, BBSSession, InputType } from '../../bbs/types';
import type { SupabaseClient } from '@supabase/supabase-js';
import { updateSession } from '../../bbs/session';
import { clear } from '../../ansi/screen';
import { theme, RESET, BOLD, DIM, FG } from '../../ansi/colors';
import { menu } from '../../ansi/menu';
import { sectionHeader } from '../../ansi/header';
import { padRight, center } from '../../ansi/text';
import { box } from '../../ansi/box';
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
}

export function createTrackerDoor(config: TrackerConfig): Door {
  const doorPrefix = `door:${config.id}`;

  function displayValue(val: number | string): string {
    if (config.labels) return config.labels[Math.round(Number(val))] || String(val);
    return String(val);
  }

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

    // Get last 7 days for sparkline
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
    const { data: weekData } = await supabase
      .from('daily_trackers')
      .select('entry_date, value')
      .eq('user_id', userId)
      .eq('tracker_type', config.trackerType)
      .gte('entry_date', weekAgo)
      .order('entry_date');

    let screen = clear() + '\r\n';

    // Today's status card
    const todayLines: string[] = [];
    if (todayEntry) {
      const val = displayValue(todayEntry.value);
      todayLines.push('');
      todayLines.push(center(`${BOLD}${FG.green}${val}${RESET} ${config.unit}`, 40));
      if (todayEntry.note) todayLines.push(center(`${DIM}${todayEntry.note}${RESET}`, 40));
      todayLines.push('');
    } else {
      todayLines.push('');
      todayLines.push(center(`${DIM}Not logged today${RESET}`, 40));
      todayLines.push('');
    }

    screen += box(todayLines, {
      style: 'double',
      width: 44,
      borderColor: theme.border,
      title: 'TODAY',
      titleColor: theme.title,
    });

    // 7-day sparkline
    if (weekData && weekData.length > 0) {
      const bars = '▁▂▃▄▅▆▇█';
      const values = weekData.map(d => Number(d.value));
      const max = Math.max(...values);
      const min = Math.min(...values);
      const range = max - min || 1;

      screen += `\r\n\r\n  ${theme.info}Last 7 days:${RESET}  `;
      for (const d of weekData) {
        const v = Number(d.value);
        const idx = Math.round(((v - min) / range) * (bars.length - 1));
        screen += `${FG.cyan}${bars[idx]}${RESET}`;
      }
      const avg = values.reduce((a, b) => a + b, 0) / values.length;
      screen += `  ${DIM}avg: ${avg.toFixed(1)} ${config.unit}${RESET}`;
    }

    screen += '\r\n\r\n';
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
    const display = displayValue(value);
    return {
      screen: `\r\n  ${theme.success}Logged: ${BOLD}${display} ${config.unit}${RESET}\r\n  ${DIM}Press any key...${RESET}`,
      inputMode: 'key',
    };
  }

  async function showHistory(userId: string, supabase: SupabaseClient, page: number): Promise<BBSResponse> {
    const pageSize = 12;
    const { data, count } = await supabase
      .from('daily_trackers')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .eq('tracker_type', config.trackerType)
      .order('entry_date', { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);

    const totalPages = Math.max(1, Math.ceil((count || 0) / pageSize));

    const rows: string[] = [''];
    if (!data || data.length === 0) {
      rows.push(`  ${DIM}No entries yet.${RESET}`);
    } else {
      rows.push(`  ${BOLD}${padRight('Date', 14)}${padRight('Value', 16)}Note${RESET}`);
      rows.push(`  ${theme.border}${'─'.repeat(50)}${RESET}`);
      for (const row of data) {
        const date = new Date(row.entry_date).toLocaleDateString();
        const val = displayValue(row.value);
        const valStr = `${BOLD}${val}${RESET} ${DIM}${config.unit}${RESET}`;
        const note = row.note ? `${DIM}${row.note}${RESET}` : '';
        rows.push(`  ${FG.cyan}${padRight(date, 14)}${RESET}${padRight(valStr, 16)}${note}`);
      }
    }
    rows.push('');

    let screen = clear() + '\r\n';
    screen += box(rows, {
      style: 'single',
      width: 60,
      borderColor: theme.border,
      title: `${config.name} HISTORY`,
      titleColor: theme.title,
    });

    screen += `\r\n  ${DIM}Page ${page}/${totalPages}  |  ${count || 0} entries${RESET}`;
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
