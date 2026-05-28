import type { SupabaseClient } from '@supabase/supabase-js';

export interface Feedback {
  id: number;
  user_id: string;
  category: string;
  body: string;
  status: string;
  created_at: string;
}

export async function addFeedback(
  supabase: SupabaseClient,
  userId: string,
  category: string,
  body: string
): Promise<Feedback | null> {
  const { data } = await supabase
    .from('user_feedback')
    .insert({ user_id: userId, category, body })
    .select()
    .single();
  return data;
}

export async function getFeedback(
  supabase: SupabaseClient,
  userId: string,
  page: number = 1,
  pageSize: number = 10
): Promise<{ items: Feedback[]; total: number }> {
  const { data, count } = await supabase
    .from('user_feedback')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);
  return { items: data || [], total: count || 0 };
}

export async function getAllFeedback(
  supabase: SupabaseClient,
  page: number = 1,
  pageSize: number = 10
): Promise<{ items: Feedback[]; total: number }> {
  const { data, count } = await supabase
    .from('user_feedback')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);
  return { items: data || [], total: count || 0 };
}
