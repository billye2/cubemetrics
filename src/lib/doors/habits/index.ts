import type { Door } from '../base';
import { underConstruction } from '../base';
import type { BBSResponse, BBSSession, InputType } from '../../bbs/types';
import type { SupabaseClient } from '@supabase/supabase-js';
import { updateSession } from '../../bbs/session';

export const habitsDoor: Door = {
  id: 'habits',
  name: 'Habit Tracker',
  category: 'habits',
  description: 'Track daily habits and build streaks',
  version: '0.1',

  async handle(
    input: string,
    inputType: InputType,
    userId: string,
    session: BBSSession,
    supabase: SupabaseClient
  ): Promise<BBSResponse> {
    if (input.toUpperCase() === 'Q') {
      await updateSession(supabase, userId, { current_location: 'main_menu' });
      return { screen: '', inputMode: 'key' };
    }
    return underConstruction(this.name);
  },
};
