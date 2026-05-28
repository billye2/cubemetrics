import type { SupabaseClient } from '@supabase/supabase-js';
import type { BBSRequest, BBSResponse } from './types';
import { getSession, createSession, updateSession } from './session';
import { handleAuth } from './auth';
import { handleMainMenu, handleProfile, handleGlobalSearch } from './menus';
import { doorRegistry } from '../doors/registry';
import { statusBar } from '../ansi/statusbar';

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

  // Track recent doors
  if (location.startsWith('door:') && inputType === 'refresh') {
    const doorId = location.split(':')[1];
    const recent = (session.recent_doors) || [];
    const updated = [doorId, ...recent.filter(d => d !== doorId)].slice(0, 5);
    await supabase.from('bbs_sessions').update({ recent_doors: updated }).eq('user_id', user.id);
  }

  let response: BBSResponse;

  if (location === 'main_menu') {
    response = await handleMainMenu(input, inputType, user.id, session, supabase, handle);
  } else if (location.startsWith('search')) {
    response = await handleGlobalSearch(input, inputType, user.id, session, supabase, handle);
  } else if (location.startsWith('profile')) {
    response = await handleProfile(input, inputType, user.id, session, supabase, handle);
  } else if (location.startsWith('category:')) {
    response = await handleMainMenu(input, inputType, user.id, session, supabase, handle);
  } else if (location.startsWith('door:')) {
    const doorId = location.split(':')[1];
    const door = doorRegistry.get(doorId);

    if (door) {
      if (input.toUpperCase() === 'Q' || input.toUpperCase() === 'X') {
        const parts = location.split(':');
        if (parts.length > 2) {
          response = await door.handle(input, inputType, user.id, session, supabase);
        } else {
          await updateSession(supabase, user.id, { current_location: 'main_menu' });
          response = await handleMainMenu('', 'refresh', user.id, session, supabase, handle);
        }
      } else {
        response = await door.handle(input, inputType, user.id, session, supabase);
      }
    } else {
      await updateSession(supabase, user.id, { current_location: 'main_menu' });
      response = await handleMainMenu('', 'refresh', user.id, session, supabase, handle);
    }
  } else {
    await updateSession(supabase, user.id, { current_location: 'main_menu' });
    response = await handleMainMenu('', 'refresh', user.id, session, supabase, handle);
  }

  // Append status bar to screens (not to prompts or OAuth signals)
  if (response.screen && response.prompt !== '__OAUTH_GOOGLE__' && response.inputMode === 'key') {
    const updatedSession = await getSession(supabase, user.id);
    const currentLoc = updatedSession?.current_location || location;
    response.screen += statusBar(currentLoc, handle);
  }

  return response;
}
