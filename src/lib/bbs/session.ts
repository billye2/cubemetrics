import type { SupabaseClient } from '@supabase/supabase-js';
import type { BBSSession } from './types';

export async function getSession(supabase: SupabaseClient, userId: string): Promise<BBSSession | null> {
  const { data } = await supabase
    .from('bbs_sessions')
    .select('*')
    .eq('user_id', userId)
    .single();
  return data;
}

export async function createSession(supabase: SupabaseClient, userId: string): Promise<BBSSession> {
  const session: Omit<BBSSession, 'last_activity'> = {
    user_id: userId,
    current_location: 'main_menu',
    door_state: {},
    recent_doors: [],
  };

  const { data, error } = await supabase
    .from('bbs_sessions')
    .upsert({ ...session, last_activity: new Date().toISOString() })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateSession(
  supabase: SupabaseClient,
  userId: string,
  updates: Partial<Pick<BBSSession, 'current_location' | 'door_state'>>
): Promise<void> {
  await supabase
    .from('bbs_sessions')
    .update({
      ...updates,
      last_activity: new Date().toISOString(),
    })
    .eq('user_id', userId);
}
