import type { Door } from '../base';
import type { BBSResponse, BBSSession, InputType } from '../../bbs/types';
import type { SupabaseClient } from '@supabase/supabase-js';
import { updateSession } from '../../bbs/session';
import * as screens from './screens';
import * as queries from './queries';

export const calendarDoor: Door = {
  id: 'calendar',
  name: 'Calendar',
  category: 'org',
  description: 'View and manage your schedule',
  version: '1.0',

  async handle(input, inputType, userId, session, supabase) {
    const loc = session.current_location;
    switch (loc) {
      case 'door:calendar':
        return handleMenu(input, inputType, userId, session, supabase);
      case 'door:calendar:add:date':
        return handleAddDate(input, userId, session, supabase);
      case 'door:calendar:add:title':
        return handleAddTitle(input, userId, session, supabase);
      case 'door:calendar:add:time':
        return handleAddTime(input, userId, session, supabase);
      case 'door:calendar:viewday:prompt':
        return handleViewDayPrompt(input, userId, session, supabase);
      case 'door:calendar:delete':
        return handleDelete(input, userId, session, supabase);
      default: {
        if (loc.startsWith('door:calendar:month')) return handleMonth(input, userId, session, supabase);
        if (loc.startsWith('door:calendar:day:')) return handleDayView(input, userId, session, supabase);
        return { screen: screens.calendarMenu(), inputMode: 'key' };
      }
    }
  },
};

async function handleMenu(input: string, inputType: InputType, userId: string, session: BBSSession, supabase: SupabaseClient): Promise<BBSResponse> {
  if (inputType === 'refresh') return { screen: screens.calendarMenu(), inputMode: 'key' };
  const key = input.toUpperCase();
  const now = new Date();
  switch (key) {
    case '1': {
      const y = now.getFullYear(), m = now.getMonth() + 1;
      await updateSession(supabase, userId, { current_location: `door:calendar:month:${y}:${m}` });
      const events = await queries.getEventsForMonth(supabase, userId, y, m);
      return { screen: screens.monthView(y, m, events), inputMode: 'key' };
    }
    case '2': {
      await updateSession(supabase, userId, { current_location: 'door:calendar:add:date', door_state: {} });
      return { screen: '', inputMode: 'line', prompt: screens.addDatePrompt() };
    }
    case '3': {
      await updateSession(supabase, userId, { current_location: 'door:calendar:viewday:prompt' });
      return { screen: '', inputMode: 'line', prompt: screens.viewDayPrompt() };
    }
    case '4': {
      await updateSession(supabase, userId, { current_location: 'door:calendar:delete' });
      return { screen: '', inputMode: 'line', prompt: screens.deletePrompt() };
    }
    default:
      return { screen: screens.calendarMenu(), inputMode: 'key' };
  }
}

async function handleMonth(input: string, userId: string, session: BBSSession, supabase: SupabaseClient): Promise<BBSResponse> {
  const parts = session.current_location.split(':');
  let year = parseInt(parts[3]), month = parseInt(parts[4]);
  const key = input.toUpperCase();

  if (key === 'Q' || key === 'X') {
    await updateSession(supabase, userId, { current_location: 'door:calendar' });
    return { screen: screens.calendarMenu(), inputMode: 'key' };
  }
  if (key === '<' || key === ',') { month--; if (month < 1) { month = 12; year--; } }
  if (key === '>' || key === '.') { month++; if (month > 12) { month = 1; year++; } }

  await updateSession(supabase, userId, { current_location: `door:calendar:month:${year}:${month}` });
  const events = await queries.getEventsForMonth(supabase, userId, year, month);
  return { screen: screens.monthView(year, month, events), inputMode: 'key' };
}

async function handleAddDate(input: string, userId: string, session: BBSSession, supabase: SupabaseClient): Promise<BBSResponse> {
  const date = input.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return { screen: screens.errorMsg('Invalid date format. Use YYYY-MM-DD'), inputMode: 'key' };
  }
  await updateSession(supabase, userId, { current_location: 'door:calendar:add:title', door_state: { date } });
  return { screen: '', inputMode: 'line', prompt: screens.addTitlePrompt() };
}

async function handleAddTitle(input: string, userId: string, session: BBSSession, supabase: SupabaseClient): Promise<BBSResponse> {
  const title = input.trim();
  if (!title) {
    await updateSession(supabase, userId, { current_location: 'door:calendar' });
    return { screen: screens.errorMsg('Title cannot be empty'), inputMode: 'key' };
  }
  await updateSession(supabase, userId, {
    current_location: 'door:calendar:add:time',
    door_state: { ...session.door_state, title },
  });
  return { screen: '', inputMode: 'line', prompt: screens.addTimePrompt() };
}

async function handleAddTime(input: string, userId: string, session: BBSSession, supabase: SupabaseClient): Promise<BBSResponse> {
  const time = input.trim() || null;
  const date = session.door_state.date as string;
  const title = session.door_state.title as string;
  await queries.addEvent(supabase, userId, title, date, time);
  await updateSession(supabase, userId, { current_location: 'door:calendar', door_state: {} });
  return { screen: screens.eventAdded(title), inputMode: 'key' };
}

async function handleViewDayPrompt(input: string, userId: string, session: BBSSession, supabase: SupabaseClient): Promise<BBSResponse> {
  const date = input.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    await updateSession(supabase, userId, { current_location: 'door:calendar' });
    return { screen: screens.errorMsg('Invalid date format. Use YYYY-MM-DD'), inputMode: 'key' };
  }
  await updateSession(supabase, userId, { current_location: `door:calendar:day:${date}` });
  const events = await queries.getEventsForDate(supabase, userId, date);
  return { screen: screens.dayView(date, events), inputMode: 'key' };
}

async function handleDayView(input: string, userId: string, session: BBSSession, supabase: SupabaseClient): Promise<BBSResponse> {
  await updateSession(supabase, userId, { current_location: 'door:calendar' });
  return { screen: screens.calendarMenu(), inputMode: 'key' };
}

async function handleDelete(input: string, userId: string, session: BBSSession, supabase: SupabaseClient): Promise<BBSResponse> {
  const id = parseInt(input.trim());
  await updateSession(supabase, userId, { current_location: 'door:calendar' });
  if (isNaN(id)) return { screen: screens.errorMsg('Invalid event number'), inputMode: 'key' };
  const ok = await queries.deleteEvent(supabase, userId, id);
  return { screen: ok ? screens.eventDeleted(id) : screens.errorMsg('Event not found'), inputMode: 'key' };
}
