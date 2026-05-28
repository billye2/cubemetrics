import type { Door } from '../base';
import type { BBSResponse, BBSSession, InputType } from '../../bbs/types';
import type { SupabaseClient } from '@supabase/supabase-js';
import { updateSession } from '../../bbs/session';
import * as screens from './screens';
import * as queries from './queries';

const PAGE_SIZE = 10;

export const todoDoor: Door = {
  id: 'todo',
  name: 'To-Do List',
  category: 'tasks',
  description: 'Manage your tasks and to-do items',
  version: '1.0',

  async handle(
    input: string,
    inputType: InputType,
    userId: string,
    session: BBSSession,
    supabase: SupabaseClient
  ): Promise<BBSResponse> {
    const loc = session.current_location;

    switch (loc) {
      case 'door:todo':
        return handleMenu(input, inputType, userId, session, supabase);
      case 'door:todo:add':
        return handleAdd(input, userId, session, supabase);
      case 'door:todo:complete':
        return handleComplete(input, userId, session, supabase);
      case 'door:todo:delete':
        return handleDelete(input, userId, session, supabase);
      default: {
        if (loc.startsWith('door:todo:list')) {
          return handleList(input, inputType, userId, session, supabase);
        }
        return { screen: screens.todoMenu(), inputMode: 'key' };
      }
    }
  },
};

async function handleMenu(
  input: string,
  inputType: InputType,
  userId: string,
  session: BBSSession,
  supabase: SupabaseClient
): Promise<BBSResponse> {
  if (inputType === 'refresh') {
    return { screen: screens.todoMenu(), inputMode: 'key' };
  }

  const key = input.toUpperCase();

  switch (key) {
    case '1': {
      await updateSession(supabase, userId, {
        current_location: 'door:todo:list:1',
        door_state: { showCompleted: false },
      });
      const { todos, total } = await queries.getTodos(supabase, userId, 1, PAGE_SIZE, false);
      return { screen: screens.todoList(todos, total, 1, PAGE_SIZE, false), inputMode: 'key' };
    }
    case '2': {
      await updateSession(supabase, userId, { current_location: 'door:todo:add' });
      return { screen: '', inputMode: 'line', prompt: screens.addPrompt() };
    }
    case '3': {
      await updateSession(supabase, userId, { current_location: 'door:todo:complete' });
      return { screen: '', inputMode: 'line', prompt: screens.completePrompt() };
    }
    case '4': {
      await updateSession(supabase, userId, { current_location: 'door:todo:delete' });
      return { screen: '', inputMode: 'line', prompt: screens.deletePrompt() };
    }
    case 'A': {
      await updateSession(supabase, userId, {
        current_location: 'door:todo:list:1',
        door_state: { showCompleted: true },
      });
      const { todos, total } = await queries.getTodos(supabase, userId, 1, PAGE_SIZE, true);
      return { screen: screens.todoList(todos, total, 1, PAGE_SIZE, true), inputMode: 'key' };
    }
    default:
      return { screen: screens.todoMenu(), inputMode: 'key' };
  }
}

async function handleList(
  input: string,
  inputType: InputType,
  userId: string,
  session: BBSSession,
  supabase: SupabaseClient
): Promise<BBSResponse> {
  const parts = session.current_location.split(':');
  let page = parseInt(parts[3] || '1');
  const showCompleted = session.door_state.showCompleted as boolean ?? false;

  const key = input.toUpperCase();

  if (key === 'Q' || key === 'X') {
    await updateSession(supabase, userId, { current_location: 'door:todo' });
    return { screen: screens.todoMenu(), inputMode: 'key' };
  }

  if (key === 'N') page++;
  if (key === 'P' && page > 1) page--;

  await updateSession(supabase, userId, {
    current_location: `door:todo:list:${page}`,
  });

  const { todos, total } = await queries.getTodos(supabase, userId, page, PAGE_SIZE, showCompleted);
  return { screen: screens.todoList(todos, total, page, PAGE_SIZE, showCompleted), inputMode: 'key' };
}

async function handleAdd(
  input: string,
  userId: string,
  session: BBSSession,
  supabase: SupabaseClient
): Promise<BBSResponse> {
  const title = input.trim();

  if (!title) {
    await updateSession(supabase, userId, { current_location: 'door:todo' });
    return { screen: screens.todoMenu(), inputMode: 'key' };
  }

  await queries.addTodo(supabase, userId, title);
  await updateSession(supabase, userId, { current_location: 'door:todo' });
  return { screen: screens.taskAdded(title), inputMode: 'key' };
}

async function handleComplete(
  input: string,
  userId: string,
  session: BBSSession,
  supabase: SupabaseClient
): Promise<BBSResponse> {
  const id = parseInt(input.trim());

  if (isNaN(id)) {
    await updateSession(supabase, userId, { current_location: 'door:todo' });
    return { screen: screens.taskError('Invalid task number'), inputMode: 'key' };
  }

  const ok = await queries.completeTodo(supabase, userId, id);
  await updateSession(supabase, userId, { current_location: 'door:todo' });

  return {
    screen: ok ? screens.taskCompleted(id) : screens.taskError('Task not found'),
    inputMode: 'key',
  };
}

async function handleDelete(
  input: string,
  userId: string,
  session: BBSSession,
  supabase: SupabaseClient
): Promise<BBSResponse> {
  const id = parseInt(input.trim());

  if (isNaN(id)) {
    await updateSession(supabase, userId, { current_location: 'door:todo' });
    return { screen: screens.taskError('Invalid task number'), inputMode: 'key' };
  }

  const ok = await queries.deleteTodo(supabase, userId, id);
  await updateSession(supabase, userId, { current_location: 'door:todo' });

  return {
    screen: ok ? screens.taskDeleted(id) : screens.taskError('Task not found'),
    inputMode: 'key',
  };
}
