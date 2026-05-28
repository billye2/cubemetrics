import type { SupabaseClient } from '@supabase/supabase-js';

export interface Note {
  id: number;
  user_id: string;
  title: string;
  body: string;
  tags: string[];
  pinned: boolean;
  updated_at: string;
  created_at: string;
}

export async function getNotes(
  supabase: SupabaseClient,
  userId: string,
  page: number = 1,
  pageSize: number = 10
): Promise<{ notes: Note[]; total: number }> {
  const { data, count } = await supabase
    .from('notes')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
    .order('pinned', { ascending: false })
    .order('updated_at', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);
  return { notes: data || [], total: count || 0 };
}

export async function getNote(supabase: SupabaseClient, userId: string, id: number): Promise<Note | null> {
  const { data } = await supabase.from('notes').select('*').eq('id', id).eq('user_id', userId).single();
  return data;
}

export async function addNote(supabase: SupabaseClient, userId: string, title: string, body: string): Promise<Note | null> {
  const { data } = await supabase
    .from('notes')
    .insert({ user_id: userId, title, body })
    .select()
    .single();
  return data;
}

export async function deleteNote(supabase: SupabaseClient, userId: string, id: number): Promise<boolean> {
  const { error } = await supabase.from('notes').delete().eq('id', id).eq('user_id', userId);
  return !error;
}

export async function togglePin(supabase: SupabaseClient, userId: string, id: number): Promise<boolean> {
  const note = await getNote(supabase, userId, id);
  if (!note) return false;
  const { error } = await supabase.from('notes').update({ pinned: !note.pinned }).eq('id', id).eq('user_id', userId);
  return !error;
}

export async function searchNotes(supabase: SupabaseClient, userId: string, query: string): Promise<Note[]> {
  const { data } = await supabase
    .from('notes')
    .select('*')
    .eq('user_id', userId)
    .or(`title.ilike.%${query}%,body.ilike.%${query}%`)
    .order('updated_at', { ascending: false })
    .limit(20);
  return data || [];
}
