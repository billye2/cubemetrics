import type { Door } from '../base';
import type { BBSResponse, BBSSession, InputType } from '../../bbs/types';
import type { SupabaseClient } from '@supabase/supabase-js';
import { updateSession } from '../../bbs/session';
import * as screens from './screens';
import * as queries from './queries';

const PAGE_SIZE = 10;
const STATUS_MAP: Record<string, string> = { '1': 'to_read', '2': 'reading', '3': 'completed', '4': 'dropped' };

export const readingDoor: Door = {
  id: 'reading',
  name: 'Reading List',
  category: 'learning',
  description: 'Track books, status, and ratings',
  version: '1.0',

  async handle(input, inputType, userId, session, supabase) {
    const loc = session.current_location;
    switch (loc) {
      case 'door:reading': return handleMenu(input, inputType, userId, session, supabase);
      case 'door:reading:add:title': return handleAddTitle(input, userId, session, supabase);
      case 'door:reading:add:author': return handleAddAuthor(input, userId, session, supabase);
      case 'door:reading:status:id': return handleStatusId(input, userId, session, supabase);
      case 'door:reading:status:choice': return handleStatusChoice(input, userId, session, supabase);
      case 'door:reading:rate:id': return handleRateId(input, userId, session, supabase);
      case 'door:reading:rate:value': return handleRateValue(input, userId, session, supabase);
      case 'door:reading:remove': return handleRemove(input, userId, session, supabase);
      default: {
        if (loc.startsWith('door:reading:list')) return handleList(input, userId, session, supabase);
        return { screen: screens.readingMenu(), inputMode: 'key' };
      }
    }
  },
};

async function handleMenu(input: string, inputType: InputType, userId: string, session: BBSSession, supabase: SupabaseClient): Promise<BBSResponse> {
  if (inputType === 'refresh') return { screen: screens.readingMenu(), inputMode: 'key' };
  switch (input.toUpperCase()) {
    case '1': {
      await updateSession(supabase, userId, { current_location: 'door:reading:list:1' });
      const { books, total } = await queries.getBooks(supabase, userId, 1, PAGE_SIZE);
      return { screen: screens.bookList(books, total, 1, PAGE_SIZE), inputMode: 'key' };
    }
    case '2': {
      await updateSession(supabase, userId, { current_location: 'door:reading:add:title', door_state: {} });
      return { screen: '', inputMode: 'line', prompt: screens.titlePrompt() };
    }
    case '3': {
      await updateSession(supabase, userId, { current_location: 'door:reading:status:id' });
      return { screen: '', inputMode: 'line', prompt: screens.statusPrompt() };
    }
    case '4': {
      await updateSession(supabase, userId, { current_location: 'door:reading:rate:id' });
      return { screen: '', inputMode: 'line', prompt: screens.ratePrompt() };
    }
    case '5': {
      await updateSession(supabase, userId, { current_location: 'door:reading:remove' });
      return { screen: '', inputMode: 'line', prompt: screens.removePrompt() };
    }
    default: return { screen: screens.readingMenu(), inputMode: 'key' };
  }
}

async function handleList(input: string, userId: string, session: BBSSession, supabase: SupabaseClient): Promise<BBSResponse> {
  const parts = session.current_location.split(':');
  let page = parseInt(parts[3] || '1');
  const key = input.toUpperCase();
  if (key === 'Q' || key === 'X') {
    await updateSession(supabase, userId, { current_location: 'door:reading' });
    return { screen: screens.readingMenu(), inputMode: 'key' };
  }
  if (key === 'N') page++;
  if (key === 'P' && page > 1) page--;
  await updateSession(supabase, userId, { current_location: `door:reading:list:${page}` });
  const { books, total } = await queries.getBooks(supabase, userId, page, PAGE_SIZE);
  return { screen: screens.bookList(books, total, page, PAGE_SIZE), inputMode: 'key' };
}

async function handleAddTitle(input: string, userId: string, session: BBSSession, supabase: SupabaseClient): Promise<BBSResponse> {
  const title = input.trim();
  if (!title) {
    await updateSession(supabase, userId, { current_location: 'door:reading' });
    return { screen: screens.readingMenu(), inputMode: 'key' };
  }
  await updateSession(supabase, userId, {
    current_location: 'door:reading:add:author',
    door_state: { title },
  });
  return { screen: '', inputMode: 'line', prompt: screens.authorPrompt() };
}

async function handleAddAuthor(input: string, userId: string, session: BBSSession, supabase: SupabaseClient): Promise<BBSResponse> {
  const title = session.door_state.title as string;
  const author = input.trim();
  await queries.addBook(supabase, userId, title, author);
  await updateSession(supabase, userId, { current_location: 'door:reading', door_state: {} });
  return { screen: screens.bookAdded(title), inputMode: 'key' };
}

async function handleStatusId(input: string, userId: string, session: BBSSession, supabase: SupabaseClient): Promise<BBSResponse> {
  const id = parseInt(input.trim());
  if (isNaN(id)) {
    await updateSession(supabase, userId, { current_location: 'door:reading' });
    return { screen: screens.errorMsg('Invalid book number'), inputMode: 'key' };
  }
  await updateSession(supabase, userId, {
    current_location: 'door:reading:status:choice',
    door_state: { bookId: id },
  });
  return { screen: '', inputMode: 'line', prompt: screens.statusChoicePrompt() };
}

async function handleStatusChoice(input: string, userId: string, session: BBSSession, supabase: SupabaseClient): Promise<BBSResponse> {
  const bookId = session.door_state.bookId as number;
  const status = STATUS_MAP[input.trim()];
  await updateSession(supabase, userId, { current_location: 'door:reading', door_state: {} });
  if (!status) return { screen: screens.errorMsg('Invalid status choice'), inputMode: 'key' };
  const ok = await queries.updateStatus(supabase, userId, bookId, status);
  return { screen: ok ? screens.statusUpdated() : screens.errorMsg('Book not found'), inputMode: 'key' };
}

async function handleRateId(input: string, userId: string, session: BBSSession, supabase: SupabaseClient): Promise<BBSResponse> {
  const id = parseInt(input.trim());
  if (isNaN(id)) {
    await updateSession(supabase, userId, { current_location: 'door:reading' });
    return { screen: screens.errorMsg('Invalid book number'), inputMode: 'key' };
  }
  await updateSession(supabase, userId, {
    current_location: 'door:reading:rate:value',
    door_state: { bookId: id },
  });
  return { screen: '', inputMode: 'line', prompt: screens.rateValuePrompt() };
}

async function handleRateValue(input: string, userId: string, session: BBSSession, supabase: SupabaseClient): Promise<BBSResponse> {
  const bookId = session.door_state.bookId as number;
  const rating = parseInt(input.trim());
  await updateSession(supabase, userId, { current_location: 'door:reading', door_state: {} });
  if (isNaN(rating) || rating < 1 || rating > 5) return { screen: screens.errorMsg('Rating must be 1-5'), inputMode: 'key' };
  const ok = await queries.rateBook(supabase, userId, bookId, rating);
  return { screen: ok ? screens.bookRated() : screens.errorMsg('Book not found'), inputMode: 'key' };
}

async function handleRemove(input: string, userId: string, session: BBSSession, supabase: SupabaseClient): Promise<BBSResponse> {
  const id = parseInt(input.trim());
  await updateSession(supabase, userId, { current_location: 'door:reading' });
  if (isNaN(id)) return { screen: screens.errorMsg('Invalid book number'), inputMode: 'key' };
  const ok = await queries.deleteBook(supabase, userId, id);
  return { screen: ok ? screens.bookRemoved(id) : screens.errorMsg('Book not found'), inputMode: 'key' };
}
