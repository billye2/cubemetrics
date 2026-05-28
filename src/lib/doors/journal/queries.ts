import type { SupabaseClient } from '@supabase/supabase-js';

export interface JournalEntry {
  id: number;
  user_id: string;
  entry_date: string;
  title: string;
  body: string;
  mood: string | null;
  created_at: string;
}

export async function getEntries(
  supabase: SupabaseClient,
  userId: string,
  page: number = 1,
  pageSize: number = 10
): Promise<{ entries: JournalEntry[]; total: number }> {
  const { data, count } = await supabase
    .from('journal_entries')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
    .order('entry_date', { ascending: false })
    .order('created_at', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  return { entries: data || [], total: count || 0 };
}

export async function getEntry(
  supabase: SupabaseClient,
  userId: string,
  entryId: number
): Promise<JournalEntry | null> {
  const { data } = await supabase
    .from('journal_entries')
    .select('*')
    .eq('id', entryId)
    .eq('user_id', userId)
    .single();
  return data;
}

export async function addEntry(
  supabase: SupabaseClient,
  userId: string,
  body: string,
  title: string = '',
  mood: string | null = null
): Promise<JournalEntry | null> {
  const { data } = await supabase
    .from('journal_entries')
    .insert({ user_id: userId, body, title, mood })
    .select()
    .single();
  return data;
}

export async function deleteEntry(
  supabase: SupabaseClient,
  userId: string,
  entryId: number
): Promise<boolean> {
  const { error } = await supabase
    .from('journal_entries')
    .delete()
    .eq('id', entryId)
    .eq('user_id', userId);
  return !error;
}
