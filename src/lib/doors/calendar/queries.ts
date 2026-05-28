import type { SupabaseClient } from '@supabase/supabase-js';

export interface CalendarEvent {
  id: number;
  user_id: string;
  title: string;
  description: string;
  start_date: string;
  start_time: string | null;
  end_date: string | null;
  end_time: string | null;
  recurrence: string | null;
  created_at: string;
}

export async function getEventsForMonth(
  supabase: SupabaseClient,
  userId: string,
  year: number,
  month: number
): Promise<CalendarEvent[]> {
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDate = new Date(year, month, 0).toISOString().split('T')[0];

  const { data } = await supabase
    .from('calendar_events')
    .select('*')
    .eq('user_id', userId)
    .gte('start_date', startDate)
    .lte('start_date', endDate)
    .order('start_date')
    .order('start_time');

  return data || [];
}

export async function getEventsForDate(
  supabase: SupabaseClient,
  userId: string,
  date: string
): Promise<CalendarEvent[]> {
  const { data } = await supabase
    .from('calendar_events')
    .select('*')
    .eq('user_id', userId)
    .eq('start_date', date)
    .order('start_time');

  return data || [];
}

export async function addEvent(
  supabase: SupabaseClient,
  userId: string,
  title: string,
  startDate: string,
  startTime: string | null = null
): Promise<CalendarEvent | null> {
  const { data } = await supabase
    .from('calendar_events')
    .insert({ user_id: userId, title, start_date: startDate, start_time: startTime })
    .select()
    .single();
  return data;
}

export async function deleteEvent(
  supabase: SupabaseClient,
  userId: string,
  eventId: number
): Promise<boolean> {
  const { error } = await supabase
    .from('calendar_events')
    .delete()
    .eq('id', eventId)
    .eq('user_id', userId);
  return !error;
}
