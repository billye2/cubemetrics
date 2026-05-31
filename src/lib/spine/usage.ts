"use server";
import { createServerSupabase } from "@/lib/supabase/server";

/** Record that the signed-in user opened an app (recency + count). Fire-and-forget
 *  from the <TrackUsage> mount beacon; throttling is unnecessary at one call per
 *  page load. No-op when signed out. */
export async function recordUsage(appId: string): Promise<void> {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.rpc("bump_app_usage", { p_app: appId });
}
