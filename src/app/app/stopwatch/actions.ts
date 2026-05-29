"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabase } from "@/lib/supabase/server";

const PATH = "/app/stopwatch";
const TRACKER_TYPE = "stopwatch";

async function requireUser() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return { supabase, userId: user.id };
}

// Logs elapsed minutes to daily_trackers — same shape the tracker template used,
// so existing stopwatch history stays compatible.
export async function logStopwatchAction(minutes: number, label: string) {
  const m = Math.round(minutes);
  if (!Number.isFinite(m) || m < 1) return;
  const { supabase, userId } = await requireUser();
  await supabase.from("daily_trackers").insert({
    user_id: userId,
    tracker_type: TRACKER_TYPE,
    value: Math.min(m, 1440),
    note: label.trim() || null,
  });
  revalidatePath(PATH);
}

export async function deleteStopwatchAction(id: number) {
  const { supabase, userId } = await requireUser();
  await supabase.from("daily_trackers").delete().eq("id", id).eq("user_id", userId);
  revalidatePath(PATH);
}
