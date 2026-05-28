import type { Door } from '../base';
import type { BBSResponse, BBSSession, InputType } from '../../bbs/types';
import type { SupabaseClient } from '@supabase/supabase-js';
import { updateSession } from '../../bbs/session';
import * as screens from './screens';
import * as queries from './queries';

export const habitsDoor: Door = {
  id: 'habits',
  name: 'Habit Tracker',
  category: 'habits',
  description: 'Track daily habits and build streaks',
  version: '1.0',

  async handle(input, inputType, userId, session, supabase) {
    const loc = session.current_location;
    switch (loc) {
      case 'door:habits':
        return handleMenu(input, inputType, userId, session, supabase);
      case 'door:habits:list':
        return handleList(input, userId, session, supabase);
      case 'door:habits:add':
        return handleAdd(input, userId, session, supabase);
      case 'door:habits:remove':
        return handleRemove(input, userId, session, supabase);
      default:
        return { screen: screens.habitsMenu(), inputMode: 'key' };
    }
  },
};

async function handleMenu(input: string, inputType: InputType, userId: string, session: BBSSession, supabase: SupabaseClient): Promise<BBSResponse> {
  if (inputType === 'refresh') return { screen: screens.habitsMenu(), inputMode: 'key' };
  switch (input.toUpperCase()) {
    case '1': {
      await updateSession(supabase, userId, { current_location: 'door:habits:list' });
      const habits = await queries.getHabits(supabase, userId);
      return { screen: screens.habitList(habits), inputMode: 'key' };
    }
    case '2': {
      await updateSession(supabase, userId, { current_location: 'door:habits:add' });
      return { screen: '', inputMode: 'line', prompt: screens.addPrompt() };
    }
    case '3': {
      await updateSession(supabase, userId, { current_location: 'door:habits:remove' });
      return { screen: '', inputMode: 'line', prompt: screens.removePrompt() };
    }
    default:
      return { screen: screens.habitsMenu(), inputMode: 'key' };
  }
}

async function handleList(input: string, userId: string, session: BBSSession, supabase: SupabaseClient): Promise<BBSResponse> {
  const key = input.toUpperCase();
  if (key === 'Q' || key === 'X') {
    await updateSession(supabase, userId, { current_location: 'door:habits' });
    return { screen: screens.habitsMenu(), inputMode: 'key' };
  }

  const id = parseInt(input);
  if (!isNaN(id)) {
    const habits = await queries.getHabits(supabase, userId);
    const habit = habits.find(h => h.id === id);
    if (habit) {
      if (habit.checkedToday) {
        return { screen: screens.errorMsg('Already checked in today!'), inputMode: 'key' };
      }
      await queries.checkIn(supabase, userId, id);
      await updateSession(supabase, userId, { current_location: 'door:habits' });
      return { screen: screens.checkedIn(habit.name), inputMode: 'key' };
    }
  }

  const habits = await queries.getHabits(supabase, userId);
  return { screen: screens.habitList(habits), inputMode: 'key' };
}

async function handleAdd(input: string, userId: string, session: BBSSession, supabase: SupabaseClient): Promise<BBSResponse> {
  const name = input.trim();
  await updateSession(supabase, userId, { current_location: 'door:habits' });
  if (!name) return { screen: screens.habitsMenu(), inputMode: 'key' };
  await queries.addHabit(supabase, userId, name);
  return { screen: screens.habitAdded(name), inputMode: 'key' };
}

async function handleRemove(input: string, userId: string, session: BBSSession, supabase: SupabaseClient): Promise<BBSResponse> {
  const id = parseInt(input.trim());
  await updateSession(supabase, userId, { current_location: 'door:habits' });
  if (isNaN(id)) return { screen: screens.errorMsg('Invalid habit number'), inputMode: 'key' };
  const ok = await queries.deleteHabit(supabase, userId, id);
  return { screen: ok ? screens.habitRemoved(id) : screens.errorMsg('Habit not found'), inputMode: 'key' };
}
