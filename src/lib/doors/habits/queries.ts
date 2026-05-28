import type { SupabaseClient } from '@supabase/supabase-js';

export interface Habit {
  id: number;
  user_id: string;
  name: string;
  frequency: string;
  active: boolean;
  created_at: string;
}

export interface HabitWithStreak extends Habit {
  streak: number;
  checkedToday: boolean;
}

export async function getHabits(supabase: SupabaseClient, userId: string): Promise<HabitWithStreak[]> {
  const { data: habits } = await supabase
    .from('habits')
    .select('*')
    .eq('user_id', userId)
    .eq('active', true)
    .order('created_at');

  if (!habits || habits.length === 0) return [];

  const today = new Date().toISOString().split('T')[0];
  const result: HabitWithStreak[] = [];

  for (const habit of habits) {
    const { data: checkins } = await supabase
      .from('habit_checkins')
      .select('checkin_date')
      .eq('habit_id', habit.id)
      .order('checkin_date', { ascending: false })
      .limit(60);

    const dates = (checkins || []).map(c => c.checkin_date);
    const checkedToday = dates.includes(today);

    let streak = 0;
    const d = new Date();
    if (!checkedToday) d.setDate(d.getDate() - 1);
    while (dates.includes(d.toISOString().split('T')[0])) {
      streak++;
      d.setDate(d.getDate() - 1);
    }
    if (checkedToday) streak++;

    result.push({ ...habit, streak, checkedToday });
  }

  return result;
}

export async function addHabit(supabase: SupabaseClient, userId: string, name: string): Promise<Habit | null> {
  const { data } = await supabase
    .from('habits')
    .insert({ user_id: userId, name })
    .select()
    .single();
  return data;
}

export async function checkIn(supabase: SupabaseClient, userId: string, habitId: number): Promise<boolean> {
  const today = new Date().toISOString().split('T')[0];
  const { error } = await supabase
    .from('habit_checkins')
    .insert({ habit_id: habitId, user_id: userId, checkin_date: today });
  return !error;
}

export async function deleteHabit(supabase: SupabaseClient, userId: string, habitId: number): Promise<boolean> {
  const { error } = await supabase
    .from('habits')
    .update({ active: false })
    .eq('id', habitId)
    .eq('user_id', userId);
  return !error;
}
