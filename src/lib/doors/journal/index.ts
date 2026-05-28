import type { Door } from '../base';
import type { BBSResponse, BBSSession, InputType } from '../../bbs/types';
import type { SupabaseClient } from '@supabase/supabase-js';
import { updateSession } from '../../bbs/session';
import * as screens from './screens';
import * as queries from './queries';

const PAGE_SIZE = 10;

export const journalDoor: Door = {
  id: 'journal',
  name: 'Journal / Daily Log',
  category: 'notes',
  description: 'Write dated entries and browse your history',
  version: '1.0',

  async handle(input, inputType, userId, session, supabase) {
    const loc = session.current_location;
    switch (loc) {
      case 'door:journal':
        return handleMenu(input, inputType, userId, session, supabase);
      case 'door:journal:write:title':
        return handleWriteTitle(input, userId, session, supabase);
      case 'door:journal:write:body':
        return handleWriteBody(input, userId, session, supabase);
      case 'door:journal:write:mood':
        return handleWriteMood(input, userId, session, supabase);
      case 'door:journal:delete':
        return handleDelete(input, userId, session, supabase);
      default: {
        if (loc.startsWith('door:journal:list')) return handleList(input, inputType, userId, session, supabase);
        if (loc.startsWith('door:journal:view:')) return handleView(input, userId, session, supabase);
        return { screen: screens.journalMenu(), inputMode: 'key' };
      }
    }
  },
};

async function handleMenu(input: string, inputType: InputType, userId: string, session: BBSSession, supabase: SupabaseClient): Promise<BBSResponse> {
  if (inputType === 'refresh') return { screen: screens.journalMenu(), inputMode: 'key' };
  const key = input.toUpperCase();
  switch (key) {
    case '1': {
      await updateSession(supabase, userId, { current_location: 'door:journal:list:1' });
      const { entries, total } = await queries.getEntries(supabase, userId, 1, PAGE_SIZE);
      return { screen: screens.entryList(entries, total, 1, PAGE_SIZE), inputMode: 'key' };
    }
    case '2': {
      await updateSession(supabase, userId, { current_location: 'door:journal:write:title', door_state: {} });
      return { screen: '', inputMode: 'line', prompt: screens.titlePrompt() };
    }
    case '3': {
      await updateSession(supabase, userId, { current_location: 'door:journal:delete' });
      return { screen: '', inputMode: 'line', prompt: screens.deletePrompt() };
    }
    default:
      return { screen: screens.journalMenu(), inputMode: 'key' };
  }
}

async function handleList(input: string, inputType: InputType, userId: string, session: BBSSession, supabase: SupabaseClient): Promise<BBSResponse> {
  const parts = session.current_location.split(':');
  let page = parseInt(parts[3] || '1');
  const key = input.toUpperCase();

  if (key === 'Q' || key === 'X') {
    await updateSession(supabase, userId, { current_location: 'door:journal' });
    return { screen: screens.journalMenu(), inputMode: 'key' };
  }
  if (key === 'N') page++;
  if (key === 'P' && page > 1) page--;

  const num = parseInt(input);
  if (!isNaN(num)) {
    const entry = await queries.getEntry(supabase, userId, num);
    if (entry) {
      await updateSession(supabase, userId, { current_location: `door:journal:view:${num}` });
      return { screen: screens.viewEntry(entry), inputMode: 'key' };
    }
  }

  await updateSession(supabase, userId, { current_location: `door:journal:list:${page}` });
  const { entries, total } = await queries.getEntries(supabase, userId, page, PAGE_SIZE);
  return { screen: screens.entryList(entries, total, page, PAGE_SIZE), inputMode: 'key' };
}

async function handleView(input: string, userId: string, session: BBSSession, supabase: SupabaseClient): Promise<BBSResponse> {
  await updateSession(supabase, userId, { current_location: 'door:journal:list:1' });
  const { entries, total } = await queries.getEntries(supabase, userId, 1, PAGE_SIZE);
  return { screen: screens.entryList(entries, total, 1, PAGE_SIZE), inputMode: 'key' };
}

async function handleWriteTitle(input: string, userId: string, session: BBSSession, supabase: SupabaseClient): Promise<BBSResponse> {
  await updateSession(supabase, userId, {
    current_location: 'door:journal:write:body',
    door_state: { title: input.trim() },
  });
  return { screen: '', inputMode: 'line', prompt: screens.bodyPrompt() };
}

async function handleWriteBody(input: string, userId: string, session: BBSSession, supabase: SupabaseClient): Promise<BBSResponse> {
  const body = input.trim();
  if (!body) {
    await updateSession(supabase, userId, { current_location: 'door:journal' });
    return { screen: screens.errorMsg('Entry cannot be empty'), inputMode: 'key' };
  }
  await updateSession(supabase, userId, {
    current_location: 'door:journal:write:mood',
    door_state: { ...session.door_state, body },
  });
  return { screen: '', inputMode: 'line', prompt: screens.moodPrompt() };
}

async function handleWriteMood(input: string, userId: string, session: BBSSession, supabase: SupabaseClient): Promise<BBSResponse> {
  const mood = input.trim() || null;
  const title = (session.door_state.title as string) || '';
  const body = session.door_state.body as string;
  await queries.addEntry(supabase, userId, body, title, mood);
  await updateSession(supabase, userId, { current_location: 'door:journal', door_state: {} });
  return { screen: screens.entryAdded(), inputMode: 'key' };
}

async function handleDelete(input: string, userId: string, session: BBSSession, supabase: SupabaseClient): Promise<BBSResponse> {
  const id = parseInt(input.trim());
  await updateSession(supabase, userId, { current_location: 'door:journal' });
  if (isNaN(id)) return { screen: screens.errorMsg('Invalid entry number'), inputMode: 'key' };
  const ok = await queries.deleteEntry(supabase, userId, id);
  return { screen: ok ? screens.entryDeleted(id) : screens.errorMsg('Entry not found'), inputMode: 'key' };
}
