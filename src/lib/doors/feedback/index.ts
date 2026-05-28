import type { Door } from '../base';
import type { BBSResponse, BBSSession, InputType } from '../../bbs/types';
import type { SupabaseClient } from '@supabase/supabase-js';
import { updateSession } from '../../bbs/session';
import * as screens from './screens';
import * as queries from './queries';

const PAGE_SIZE = 10;

export const feedbackDoor: Door = {
  id: 'feedback',
  name: 'Feedback',
  category: 'work',
  description: 'Submit feedback to improve XPBBS',
  version: '1.0',

  async handle(input, inputType, userId, session, supabase) {
    const loc = session.current_location;
    switch (loc) {
      case 'door:feedback': return handleMenu(input, inputType, userId, session, supabase);
      case 'door:feedback:category': return handleCategory(input, userId, session, supabase);
      case 'door:feedback:body': return handleBody(input, userId, session, supabase);
      default: {
        if (loc.startsWith('door:feedback:list')) return handleList(input, userId, session, supabase);
        if (loc.startsWith('door:feedback:board')) return handleBoard(input, userId, session, supabase);
        return { screen: screens.feedbackMenu(), inputMode: 'key' };
      }
    }
  },
};

async function handleMenu(input: string, inputType: InputType, userId: string, session: BBSSession, supabase: SupabaseClient): Promise<BBSResponse> {
  if (inputType === 'refresh') return { screen: screens.feedbackMenu(), inputMode: 'key' };
  switch (input.toUpperCase()) {
    case '1': {
      await updateSession(supabase, userId, { current_location: 'door:feedback:category', door_state: {} });
      return { screen: screens.categoryMenu(), inputMode: 'key' };
    }
    case '2': {
      await updateSession(supabase, userId, { current_location: 'door:feedback:list:1' });
      const { items, total } = await queries.getFeedback(supabase, userId, 1, PAGE_SIZE);
      return { screen: screens.feedbackList(items, total, 1, PAGE_SIZE), inputMode: 'key' };
    }
    case '3': {
      await updateSession(supabase, userId, { current_location: 'door:feedback:board:1' });
      const { items, total } = await queries.getAllFeedback(supabase, 1, PAGE_SIZE);
      return { screen: screens.feedbackBoard(items, total, 1, PAGE_SIZE), inputMode: 'key' };
    }
    default: return { screen: screens.feedbackMenu(), inputMode: 'key' };
  }
}

async function handleCategory(input: string, userId: string, session: BBSSession, supabase: SupabaseClient): Promise<BBSResponse> {
  const cat = screens.CATEGORIES.find(c => c.key === input);
  if (!cat) {
    await updateSession(supabase, userId, { current_location: 'door:feedback' });
    return { screen: screens.feedbackMenu(), inputMode: 'key' };
  }
  await updateSession(supabase, userId, {
    current_location: 'door:feedback:body',
    door_state: { category: cat.id },
  });
  return { screen: '', inputMode: 'line', prompt: screens.bodyPrompt() };
}

async function handleBody(input: string, userId: string, session: BBSSession, supabase: SupabaseClient): Promise<BBSResponse> {
  const body = input.trim();
  if (!body) {
    await updateSession(supabase, userId, { current_location: 'door:feedback' });
    return { screen: screens.errorMsg('Feedback cannot be empty'), inputMode: 'key' };
  }
  const category = (session.door_state.category as string) || 'other';
  await queries.addFeedback(supabase, userId, category, body);
  await updateSession(supabase, userId, { current_location: 'door:feedback', door_state: {} });
  return { screen: screens.submitted(), inputMode: 'key' };
}

async function handleList(input: string, userId: string, session: BBSSession, supabase: SupabaseClient): Promise<BBSResponse> {
  const parts = session.current_location.split(':');
  let page = parseInt(parts[3] || '1');
  const key = input.toUpperCase();

  if (key === 'Q' || key === 'X') {
    await updateSession(supabase, userId, { current_location: 'door:feedback' });
    return { screen: screens.feedbackMenu(), inputMode: 'key' };
  }
  if (key === 'N') page++;
  if (key === 'P' && page > 1) page--;

  await updateSession(supabase, userId, { current_location: `door:feedback:list:${page}` });
  const { items, total } = await queries.getFeedback(supabase, userId, page, PAGE_SIZE);
  return { screen: screens.feedbackList(items, total, page, PAGE_SIZE), inputMode: 'key' };
}

async function handleBoard(input: string, userId: string, session: BBSSession, supabase: SupabaseClient): Promise<BBSResponse> {
  const parts = session.current_location.split(':');
  let page = parseInt(parts[3] || '1');
  const key = input.toUpperCase();

  if (key === 'Q' || key === 'X') {
    await updateSession(supabase, userId, { current_location: 'door:feedback' });
    return { screen: screens.feedbackMenu(), inputMode: 'key' };
  }
  if (key === 'N') page++;
  if (key === 'P' && page > 1) page--;

  await updateSession(supabase, userId, { current_location: `door:feedback:board:${page}` });
  const { items, total } = await queries.getAllFeedback(supabase, page, PAGE_SIZE);
  return { screen: screens.feedbackBoard(items, total, page, PAGE_SIZE), inputMode: 'key' };
}
