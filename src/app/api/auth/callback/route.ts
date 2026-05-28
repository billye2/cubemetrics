import { createServerSupabase } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');

  if (code) {
    const supabase = await createServerSupabase();
    const { data: { user }, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && user) {
      // Create or update BBS profile from Google account
      const handle = user.user_metadata?.name
        || user.email?.split('@')[0]
        || 'Anonymous';

      const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .single();

      if (!existing) {
        await supabase.from('profiles').insert({
          id: user.id,
          handle,
          role: 'user',
          level: 1,
          total_calls: 1,
          last_login: new Date().toISOString(),
        });

        await supabase.from('bbs_sessions').upsert({
          user_id: user.id,
          current_location: 'main_menu',
          door_state: {},
          last_activity: new Date().toISOString(),
        });
      } else {
        const { data: profile } = await supabase
          .from('profiles')
          .select('total_calls')
          .eq('id', user.id)
          .single();

        await supabase.from('profiles').update({
          last_login: new Date().toISOString(),
          total_calls: (profile?.total_calls || 0) + 1,
        }).eq('id', user.id);

        await supabase.from('bbs_sessions').upsert({
          user_id: user.id,
          current_location: 'main_menu',
          door_state: {},
          last_activity: new Date().toISOString(),
        });
      }
    }
  }

  // Close the popup and signal the parent window
  return new NextResponse(
    `<!DOCTYPE html>
    <html>
      <body>
        <script>
          if (window.opener) {
            window.opener.postMessage('auth_complete', '*');
            window.close();
          } else {
            window.location.href = '/';
          }
        </script>
        <p>Authentication complete. You can close this window.</p>
      </body>
    </html>`,
    { headers: { 'Content-Type': 'text/html' } }
  );
}
