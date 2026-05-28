import type { Door } from '../base';
import type { BBSResponse, BBSSession, InputType } from '../../bbs/types';
import type { SupabaseClient } from '@supabase/supabase-js';
import { updateSession } from '../../bbs/session';
import * as screens from './screens';
import * as queries from './queries';

export const pomodoroDoor: Door = {
  id: 'pomodoro',
  name: 'Pomodoro Timer',
  category: 'time',
  description: 'Focus sessions with timed intervals',
  version: '1.0',

  async handle(input, inputType, userId, session, supabase) {
    const loc = session.current_location;
    switch (loc) {
      case 'door:pomodoro':
        return handleMenu(input, inputType, userId, session, supabase);
      case 'door:pomodoro:label':
        return handleLabel(input, userId, session, supabase);
      case 'door:pomodoro:active':
        return handleActive(input, userId, session, supabase);
      default:
        return handleMenu(input, 'refresh', userId, session, supabase);
    }
  },
};

async function handleMenu(input: string, inputType: InputType, userId: string, session: BBSSession, supabase: SupabaseClient): Promise<BBSResponse> {
  // Check for active session first
  const active = await queries.getActiveSession(supabase, userId);
  if (active) {
    await updateSession(supabase, userId, { current_location: 'door:pomodoro:active', door_state: { sessionId: active.id } });
    return showTimer(active, userId, supabase);
  }

  if (inputType === 'refresh') {
    const today = await queries.getCompletedToday(supabase, userId);
    return { screen: screens.pomodoroMenu(today), inputMode: 'key' };
  }

  const key = input.toUpperCase();
  let duration = 0;
  switch (key) {
    case '1': duration = 25; break;
    case '2': duration = 15; break;
    case '3': duration = 50; break;
    default: {
      const today = await queries.getCompletedToday(supabase, userId);
      return { screen: screens.pomodoroMenu(today), inputMode: 'key' };
    }
  }

  await updateSession(supabase, userId, {
    current_location: 'door:pomodoro:label',
    door_state: { duration },
  });
  return { screen: '', inputMode: 'line', prompt: screens.labelPrompt() };
}

async function handleLabel(input: string, userId: string, session: BBSSession, supabase: SupabaseClient): Promise<BBSResponse> {
  const label = input.trim();
  const duration = session.door_state.duration as number;
  const pom = await queries.startSession(supabase, userId, duration, label);
  if (pom) {
    await updateSession(supabase, userId, {
      current_location: 'door:pomodoro:active',
      door_state: { sessionId: pom.id },
    });
  }
  return { screen: screens.sessionStarted(), inputMode: 'key' };
}

async function handleActive(input: string, userId: string, session: BBSSession, supabase: SupabaseClient): Promise<BBSResponse> {
  const key = input.toUpperCase();
  const sessionId = session.door_state.sessionId as number;

  if (key === 'C') {
    await queries.cancelSession(supabase, userId, sessionId);
    await updateSession(supabase, userId, { current_location: 'door:pomodoro', door_state: {} });
    return { screen: screens.sessionCancelled(), inputMode: 'key' };
  }

  const active = await queries.getActiveSession(supabase, userId);
  if (!active) {
    await updateSession(supabase, userId, { current_location: 'door:pomodoro', door_state: {} });
    const today = await queries.getCompletedToday(supabase, userId);
    return { screen: screens.pomodoroMenu(today), inputMode: 'key' };
  }

  return showTimer(active, userId, supabase);
}

async function showTimer(pom: queries.PomodoroSession, userId: string, supabase: SupabaseClient): Promise<BBSResponse> {
  const startedAt = new Date(pom.started_at).getTime();
  const now = Date.now();
  const elapsedSec = Math.floor((now - startedAt) / 1000);
  const totalSec = pom.duration_minutes * 60;
  const completed = elapsedSec >= totalSec;

  if (completed && !pom.completed) {
    await queries.completeSession(supabase, userId, pom.id);
  }

  const today = await queries.getCompletedToday(supabase, userId);

  return {
    screen: screens.timerView(pom.label, pom.duration_minutes, elapsedSec, completed, today),
    inputMode: 'key',
  };
}
