import type { SupabaseClient } from '@supabase/supabase-js';

export interface Todo {
  id: number;
  user_id: string;
  title: string;
  completed: boolean;
  priority: number;
  due_date: string | null;
  completed_at: string | null;
  created_at: string;
}

export async function getTodos(
  supabase: SupabaseClient,
  userId: string,
  page: number = 1,
  pageSize: number = 10,
  showCompleted: boolean = false
): Promise<{ todos: Todo[]; total: number }> {
  let query = supabase
    .from('todos')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
    .order('completed', { ascending: true })
    .order('priority', { ascending: false })
    .order('created_at', { ascending: false });

  if (!showCompleted) {
    query = query.eq('completed', false);
  }

  const { data, count } = await query
    .range((page - 1) * pageSize, page * pageSize - 1);

  return { todos: data || [], total: count || 0 };
}

export async function addTodo(
  supabase: SupabaseClient,
  userId: string,
  title: string,
  priority: number = 0
): Promise<Todo | null> {
  const { data } = await supabase
    .from('todos')
    .insert({ user_id: userId, title, priority })
    .select()
    .single();
  return data;
}

export async function completeTodo(
  supabase: SupabaseClient,
  userId: string,
  todoId: number
): Promise<boolean> {
  const { error } = await supabase
    .from('todos')
    .update({ completed: true, completed_at: new Date().toISOString() })
    .eq('id', todoId)
    .eq('user_id', userId);
  return !error;
}

export async function deleteTodo(
  supabase: SupabaseClient,
  userId: string,
  todoId: number
): Promise<boolean> {
  const { error } = await supabase
    .from('todos')
    .delete()
    .eq('id', todoId)
    .eq('user_id', userId);
  return !error;
}
