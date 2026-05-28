import type { SupabaseClient } from '@supabase/supabase-js';

export interface Expense {
  id: number;
  user_id: string;
  amount: number;
  currency: string;
  category: string;
  description: string;
  expense_date: string;
  created_at: string;
}

const CATEGORIES = ['Food', 'Transport', 'Housing', 'Utilities', 'Entertainment', 'Health', 'Shopping', 'Other'];
export { CATEGORIES };

export async function getExpenses(
  supabase: SupabaseClient,
  userId: string,
  page: number = 1,
  pageSize: number = 10
): Promise<{ expenses: Expense[]; total: number }> {
  const { data, count } = await supabase
    .from('expenses')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
    .order('expense_date', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);
  return { expenses: data || [], total: count || 0 };
}

export async function addExpense(
  supabase: SupabaseClient,
  userId: string,
  amount: number,
  category: string,
  description: string = ''
): Promise<Expense | null> {
  const { data } = await supabase
    .from('expenses')
    .insert({ user_id: userId, amount, category, description })
    .select()
    .single();
  return data;
}

export async function deleteExpense(supabase: SupabaseClient, userId: string, id: number): Promise<boolean> {
  const { error } = await supabase.from('expenses').delete().eq('id', id).eq('user_id', userId);
  return !error;
}

export async function getMonthlySummary(
  supabase: SupabaseClient,
  userId: string
): Promise<{ category: string; total: number }[]> {
  const now = new Date();
  const startOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const { data } = await supabase
    .from('expenses')
    .select('category, amount')
    .eq('user_id', userId)
    .gte('expense_date', startOfMonth);

  const totals: Record<string, number> = {};
  for (const row of data || []) {
    totals[row.category] = (totals[row.category] || 0) + Number(row.amount);
  }
  return Object.entries(totals).map(([category, total]) => ({ category, total })).sort((a, b) => b.total - a.total);
}
