import type { SupabaseClient } from '@supabase/supabase-js';

export interface PomodoroSession {
  id: number;
  user_id: string;
  started_at: string;
  duration_minutes: number;
  completed: boolean;
  completed_at: string | null;
  label: string;
  created_at: string;
}

export async function getActiveSession(
  supabase: SupabaseClient,
  userId: string
): Promise<PomodoroSession | null> {
  const { data } = await supabase
    .from('pomodoro_sessions')
    .select('*')
    .eq('user_id', userId)
    .eq('completed', false)
    .order('started_at', { ascending: false })
    .limit(1)
    .single();
  return data;
}

export async function startSession(
  supabase: SupabaseClient,
  userId: string,
  duration: number = 25,
  label: string = ''
): Promise<PomodoroSession | null> {
  const { data } = await supabase
    .from('pomodoro_sessions')
    .insert({
      user_id: userId,
      started_at: new Date().toISOString(),
      duration_minutes: duration,
      label,
    })
    .select()
    .single();
  return data;
}

export async function completeSession(
  supabase: SupabaseClient,
  userId: string,
  sessionId: number
): Promise<boolean> {
  const { error } = await supabase
    .from('pomodoro_sessions')
    .update({ completed: true, completed_at: new Date().toISOString() })
    .eq('id', sessionId)
    .eq('user_id', userId);
  return !error;
}

export async function cancelSession(
  supabase: SupabaseClient,
  userId: string,
  sessionId: number
): Promise<boolean> {
  const { error } = await supabase
    .from('pomodoro_sessions')
    .delete()
    .eq('id', sessionId)
    .eq('user_id', userId);
  return !error;
}

export async function getCompletedToday(
  supabase: SupabaseClient,
  userId: string
): Promise<number> {
  const today = new Date().toISOString().split('T')[0];
  const { count } = await supabase
    .from('pomodoro_sessions')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('completed', true)
    .gte('completed_at', today + 'T00:00:00');
  return count || 0;
}
