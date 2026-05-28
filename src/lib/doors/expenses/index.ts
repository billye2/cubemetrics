import type { Door } from '../base';
import type { BBSResponse, BBSSession, InputType } from '../../bbs/types';
import type { SupabaseClient } from '@supabase/supabase-js';
import { updateSession } from '../../bbs/session';
import * as screens from './screens';
import * as queries from './queries';

const PAGE_SIZE = 10;

export const expensesDoor: Door = {
  id: 'expenses',
  name: 'Expense Tracker',
  category: 'finance',
  description: 'Log and categorize your expenses',
  version: '1.0',

  async handle(input, inputType, userId, session, supabase) {
    const loc = session.current_location;
    switch (loc) {
      case 'door:expenses': return handleMenu(input, inputType, userId, session, supabase);
      case 'door:expenses:add:amount': return handleAmount(input, userId, session, supabase);
      case 'door:expenses:add:category': return handleCategory(input, userId, session, supabase);
      case 'door:expenses:add:desc': return handleDesc(input, userId, session, supabase);
      case 'door:expenses:delete': return handleDelete(input, userId, session, supabase);
      case 'door:expenses:summary': {
        await updateSession(supabase, userId, { current_location: 'door:expenses' });
        return { screen: screens.expensesMenu(), inputMode: 'key' };
      }
      default: {
        if (loc.startsWith('door:expenses:list')) return handleList(input, userId, session, supabase);
        return { screen: screens.expensesMenu(), inputMode: 'key' };
      }
    }
  },
};

async function handleMenu(input: string, inputType: InputType, userId: string, session: BBSSession, supabase: SupabaseClient): Promise<BBSResponse> {
  if (inputType === 'refresh') return { screen: screens.expensesMenu(), inputMode: 'key' };
  switch (input.toUpperCase()) {
    case '1': {
      await updateSession(supabase, userId, { current_location: 'door:expenses:list:1' });
      const { expenses, total } = await queries.getExpenses(supabase, userId, 1, PAGE_SIZE);
      return { screen: screens.expenseList(expenses, total, 1, PAGE_SIZE), inputMode: 'key' };
    }
    case '2': {
      await updateSession(supabase, userId, { current_location: 'door:expenses:add:amount', door_state: {} });
      return { screen: '', inputMode: 'line', prompt: screens.amountPrompt() };
    }
    case '3': {
      await updateSession(supabase, userId, { current_location: 'door:expenses:summary' });
      const summary = await queries.getMonthlySummary(supabase, userId);
      return { screen: screens.monthlySummary(summary), inputMode: 'key' };
    }
    case '4': {
      await updateSession(supabase, userId, { current_location: 'door:expenses:delete' });
      return { screen: '', inputMode: 'line', prompt: screens.deletePrompt() };
    }
    default: return { screen: screens.expensesMenu(), inputMode: 'key' };
  }
}

async function handleList(input: string, userId: string, session: BBSSession, supabase: SupabaseClient): Promise<BBSResponse> {
  const parts = session.current_location.split(':');
  let page = parseInt(parts[3] || '1');
  const key = input.toUpperCase();
  if (key === 'Q' || key === 'X') {
    await updateSession(supabase, userId, { current_location: 'door:expenses' });
    return { screen: screens.expensesMenu(), inputMode: 'key' };
  }
  if (key === 'N') page++;
  if (key === 'P' && page > 1) page--;
  await updateSession(supabase, userId, { current_location: `door:expenses:list:${page}` });
  const { expenses, total } = await queries.getExpenses(supabase, userId, page, PAGE_SIZE);
  return { screen: screens.expenseList(expenses, total, page, PAGE_SIZE), inputMode: 'key' };
}

async function handleAmount(input: string, userId: string, session: BBSSession, supabase: SupabaseClient): Promise<BBSResponse> {
  const amount = parseFloat(input.trim().replace('$', ''));
  if (isNaN(amount) || amount <= 0) {
    await updateSession(supabase, userId, { current_location: 'door:expenses' });
    return { screen: screens.errorMsg('Invalid amount'), inputMode: 'key' };
  }
  await updateSession(supabase, userId, {
    current_location: 'door:expenses:add:category',
    door_state: { amount },
  });
  return { screen: '', inputMode: 'line', prompt: screens.categoryPrompt() };
}

async function handleCategory(input: string, userId: string, session: BBSSession, supabase: SupabaseClient): Promise<BBSResponse> {
  const idx = parseInt(input.trim()) - 1;
  const category = queries.CATEGORIES[idx] || 'Other';
  await updateSession(supabase, userId, {
    current_location: 'door:expenses:add:desc',
    door_state: { ...session.door_state, category },
  });
  return { screen: '', inputMode: 'line', prompt: screens.descriptionPrompt() };
}

async function handleDesc(input: string, userId: string, session: BBSSession, supabase: SupabaseClient): Promise<BBSResponse> {
  const amount = session.door_state.amount as number;
  const category = session.door_state.category as string;
  await queries.addExpense(supabase, userId, amount, category, input.trim());
  await updateSession(supabase, userId, { current_location: 'door:expenses', door_state: {} });
  return { screen: screens.expenseAdded(amount, category), inputMode: 'key' };
}

async function handleDelete(input: string, userId: string, session: BBSSession, supabase: SupabaseClient): Promise<BBSResponse> {
  const id = parseInt(input.trim());
  await updateSession(supabase, userId, { current_location: 'door:expenses' });
  if (isNaN(id)) return { screen: screens.errorMsg('Invalid expense number'), inputMode: 'key' };
  const ok = await queries.deleteExpense(supabase, userId, id);
  return { screen: ok ? screens.expenseDeleted(id) : screens.errorMsg('Expense not found'), inputMode: 'key' };
}
