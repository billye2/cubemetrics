import type { Door } from '../base';
import { underConstruction } from '../base';
import type { BBSResponse, BBSSession, InputType } from '../../bbs/types';
import type { SupabaseClient } from '@supabase/supabase-js';
import { updateSession } from '../../bbs/session';

export const notesDoor: Door = {
  id: 'notes',
  name: 'Quick Notes',
  category: 'notes',
  description: 'Create and search quick notes',
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
