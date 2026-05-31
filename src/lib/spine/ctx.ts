import "server-only";
import { createServerSupabase } from "@/lib/supabase/server";
import type { SpineCtx } from "./types";

type Supabase = SpineCtx["supabase"];

/** Low-level ctx builder. Phase 4's cron uses this with a service-role client to
 *  build a ctx for an arbitrary user (every adapter filters by userId, so RLS
 *  bypass never leaks across users). */
export function buildSpineCtx(supabase: Supabase, userId: string, tz: string, now: Date): SpineCtx {
  return { supabase, userId, tz, now };
}

/** Build a SpineCtx for the signed-in user. Returns null if not authenticated. */
export async function getSpineCtx(now: Date = new Date()): Promise<SpineCtx | null> {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  let tz = "UTC";
  const { data: prof } = await supabase.from("profiles").select("timezone").eq("id", user.id).single();
  if (prof?.timezone) tz = prof.timezone as string;
  return buildSpineCtx(supabase, user.id, tz, now);
}
