import { createServerSupabase } from '@/lib/supabase/server';
import { handleInput } from '@/lib/bbs/engine';
import type { BBSRequest } from '@/lib/bbs/types';

export async function POST(request: Request) {
  const body = (await request.json()) as BBSRequest;
  const supabase = await createServerSupabase();
  const response = await handleInput(body, supabase);
  return Response.json(response);
}
