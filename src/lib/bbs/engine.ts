import type { SupabaseClient } from '@supabase/supabase-js';
import type { BBSRequest, BBSResponse } from './types';
import { getSession, createSession, updateSession } from './session';
import { handleAuth } from './auth';
import { handleMainMenu, handleProfile } from './menus';
import { doorRegistry } from '../doors/registry';

export async function handleInput(
  request: BBSRequest,
  supabase: SupabaseClient
): Promise<BBSResponse> {
  const { input, inputType } = request;

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return handleAuth(input, inputType, null, supabase);
  }

  let session = await getSession(supabase, user.id);
  if (!session) {
    session = await createSession(supabase, user.id);
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('handle')
    .eq('id', user.id)
    .single();
  const handle = profile?.handle || 'Unknown';

  const location = session.current_location;

  if (location === 'main_menu') {
    return handleMainMenu(input, inputType, user.id, session, supabase, handle);
  }

  if (location.startsWith('profile')) {
    return handleProfile(input, inputType, user.id, session, supabase, handle);
  }

  if (location.startsWith('category:')) {
    return handleMainMenu(input, inputType, user.id, session, supabase, handle);
  }

  if (location.startsWith('door:')) {
    const doorId = location.split(':')[1];
    const door = doorRegistry.get(doorId);

    if (door) {
      if (input.toUpperCase() === 'Q' || input.toUpperCase() === 'X') {
        const parts = location.split(':');
        if (parts.length > 2) {
          return door.handle(input, inputType, user.id, session, supabase);
        }
        await updateSession(supabase, user.id, { current_location: 'main_menu' });
        return handleMainMenu('', 'refresh', user.id, session, supabase, handle);
      }

      return door.handle(input, inputType, user.id, session, supabase);
    }
  }

  await updateSession(supabase, user.id, { current_location: 'main_menu' });
  return handleMainMenu('', 'refresh', user.id, session, supabase, handle);
}
