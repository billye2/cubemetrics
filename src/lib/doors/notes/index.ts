import type { Door } from '../base';
import type { BBSResponse, BBSSession, InputType } from '../../bbs/types';
import type { SupabaseClient } from '@supabase/supabase-js';
import { updateSession } from '../../bbs/session';
import * as screens from './screens';
import * as queries from './queries';

const PAGE_SIZE = 10;

export const notesDoor: Door = {
  id: 'notes',
  name: 'Quick Notes',
  category: 'notes',
  description: 'Create and search quick notes',
  version: '1.0',

  async handle(input, inputType, userId, session, supabase) {
    const loc = session.current_location;
    switch (loc) {
      case 'door:notes': return handleMenu(input, inputType, userId, session, supabase);
      case 'door:notes:add:title': return handleAddTitle(input, userId, session, supabase);
      case 'door:notes:add:body': return handleAddBody(input, userId, session, supabase);
      case 'door:notes:search': return handleSearch(input, userId, session, supabase);
      case 'door:notes:delete': return handleDelete(input, userId, session, supabase);
      case 'door:notes:search:results': {
        await updateSession(supabase, userId, { current_location: 'door:notes' });
        return { screen: screens.notesMenu(), inputMode: 'key' };
      }
      default: {
        if (loc.startsWith('door:notes:list')) return handleList(input, userId, session, supabase);
        if (loc.startsWith('door:notes:view:')) {
          await updateSession(supabase, userId, { current_location: 'door:notes:list:1' });
          const { notes, total } = await queries.getNotes(supabase, userId, 1, PAGE_SIZE);
          return { screen: screens.noteList(notes, total, 1, PAGE_SIZE), inputMode: 'key' };
        }
        return { screen: screens.notesMenu(), inputMode: 'key' };
      }
    }
  },
};

async function handleMenu(input: string, inputType: InputType, userId: string, session: BBSSession, supabase: SupabaseClient): Promise<BBSResponse> {
  if (inputType === 'refresh') return { screen: screens.notesMenu(), inputMode: 'key' };
  switch (input.toUpperCase()) {
    case '1': {
      await updateSession(supabase, userId, { current_location: 'door:notes:list:1' });
      const { notes, total } = await queries.getNotes(supabase, userId, 1, PAGE_SIZE);
      return { screen: screens.noteList(notes, total, 1, PAGE_SIZE), inputMode: 'key' };
    }
    case '2': {
      await updateSession(supabase, userId, { current_location: 'door:notes:add:title', door_state: {} });
      return { screen: '', inputMode: 'line', prompt: screens.titlePrompt() };
    }
    case '3': {
      await updateSession(supabase, userId, { current_location: 'door:notes:search' });
      return { screen: '', inputMode: 'line', prompt: screens.searchPrompt() };
    }
    case '4': {
      await updateSession(supabase, userId, { current_location: 'door:notes:delete' });
      return { screen: '', inputMode: 'line', prompt: screens.deletePrompt() };
    }
    default: return { screen: screens.notesMenu(), inputMode: 'key' };
  }
}

async function handleList(input: string, userId: string, session: BBSSession, supabase: SupabaseClient): Promise<BBSResponse> {
  const parts = session.current_location.split(':');
  let page = parseInt(parts[3] || '1');
  const key = input.toUpperCase();

  if (key === 'Q' || key === 'X') {
    await updateSession(supabase, userId, { current_location: 'door:notes' });
    return { screen: screens.notesMenu(), inputMode: 'key' };
  }
  if (key === 'N') page++;
  if (key === 'P' && page > 1) page--;
  if (key === 'T') {
    await updateSession(supabase, userId, { current_location: 'door:notes:list:' + page });
    return { screen: '', inputMode: 'line', prompt: screens.pinPrompt() };
  }

  const num = parseInt(input);
  if (!isNaN(num)) {
    const note = await queries.getNote(supabase, userId, num);
    if (note) {
      await updateSession(supabase, userId, { current_location: `door:notes:view:${num}` });
      return { screen: screens.viewNote(note), inputMode: 'key' };
    }
  }

  await updateSession(supabase, userId, { current_location: `door:notes:list:${page}` });
  const { notes, total } = await queries.getNotes(supabase, userId, page, PAGE_SIZE);
  return { screen: screens.noteList(notes, total, page, PAGE_SIZE), inputMode: 'key' };
}

async function handleAddTitle(input: string, userId: string, session: BBSSession, supabase: SupabaseClient): Promise<BBSResponse> {
  await updateSession(supabase, userId, {
    current_location: 'door:notes:add:body',
    door_state: { title: input.trim() },
  });
  return { screen: '', inputMode: 'line', prompt: screens.bodyPrompt() };
}

async function handleAddBody(input: string, userId: string, session: BBSSession, supabase: SupabaseClient): Promise<BBSResponse> {
  const body = input.trim();
  if (!body) {
    await updateSession(supabase, userId, { current_location: 'door:notes' });
    return { screen: screens.errorMsg('Note cannot be empty'), inputMode: 'key' };
  }
  const title = (session.door_state.title as string) || '';
  await queries.addNote(supabase, userId, title, body);
  await updateSession(supabase, userId, { current_location: 'door:notes', door_state: {} });
  return { screen: screens.noteAdded(), inputMode: 'key' };
}

async function handleSearch(input: string, userId: string, session: BBSSession, supabase: SupabaseClient): Promise<BBSResponse> {
  const query = input.trim();
  if (!query) {
    await updateSession(supabase, userId, { current_location: 'door:notes' });
    return { screen: screens.notesMenu(), inputMode: 'key' };
  }
  await updateSession(supabase, userId, { current_location: 'door:notes:search:results' });
  const notes = await queries.searchNotes(supabase, userId, query);
  return { screen: screens.searchResults(notes, query), inputMode: 'key' };
}

async function handleDelete(input: string, userId: string, session: BBSSession, supabase: SupabaseClient): Promise<BBSResponse> {
  const id = parseInt(input.trim());
  await updateSession(supabase, userId, { current_location: 'door:notes' });
  if (isNaN(id)) return { screen: screens.errorMsg('Invalid note number'), inputMode: 'key' };
  const ok = await queries.deleteNote(supabase, userId, id);
  return { screen: ok ? screens.noteDeleted(id) : screens.errorMsg('Note not found'), inputMode: 'key' };
}
