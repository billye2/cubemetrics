import { createServerSupabase } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = await createServerSupabase();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/auth/callback`,
      queryParams: {
        prompt: 'select_account',
      },
    },
  });

  if (error || !data.url) {
    return NextResponse.json({ error: 'Failed to initiate OAuth' }, { status: 500 });
  }

  return NextResponse.redirect(data.url);
}
