import type { SupabaseClient } from '@supabase/supabase-js';

export interface Book {
  id: number;
  user_id: string;
  title: string;
  author: string;
  status: 'to_read' | 'reading' | 'completed' | 'dropped';
  rating: number | null;
  notes: string;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
}

const STATUS_ORDER = { reading: 0, to_read: 1, completed: 2, dropped: 3 };

export async function getBooks(
  supabase: SupabaseClient,
  userId: string,
  page: number = 1,
  pageSize: number = 10
): Promise<{ books: Book[]; total: number }> {
  const { data, count } = await supabase
    .from('reading_list')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  const books = (data || []).sort((a: Book, b: Book) =>
    (STATUS_ORDER[a.status] || 9) - (STATUS_ORDER[b.status] || 9)
  );
  return { books, total: count || 0 };
}

export async function addBook(supabase: SupabaseClient, userId: string, title: string, author: string): Promise<Book | null> {
  const { data } = await supabase
    .from('reading_list')
    .insert({ user_id: userId, title, author })
    .select()
    .single();
  return data;
}

export async function updateStatus(supabase: SupabaseClient, userId: string, bookId: number, status: string): Promise<boolean> {
  const updates: Record<string, unknown> = { status };
  if (status === 'reading') updates.started_at = new Date().toISOString().split('T')[0];
  if (status === 'completed') updates.finished_at = new Date().toISOString().split('T')[0];
  const { error } = await supabase.from('reading_list').update(updates).eq('id', bookId).eq('user_id', userId);
  return !error;
}

export async function rateBook(supabase: SupabaseClient, userId: string, bookId: number, rating: number): Promise<boolean> {
  const { error } = await supabase.from('reading_list').update({ rating }).eq('id', bookId).eq('user_id', userId);
  return !error;
}

export async function deleteBook(supabase: SupabaseClient, userId: string, bookId: number): Promise<boolean> {
  const { error } = await supabase.from('reading_list').delete().eq('id', bookId).eq('user_id', userId);
  return !error;
}
