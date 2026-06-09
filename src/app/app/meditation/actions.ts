"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabase } from "@/lib/supabase/server";

const PATH = "/app/meditation";
const TYPE = "meditation";
const GOAL_TYPE = "meditation_goal"; // config row, guarded out of XP (see xp/compute.ts)

async function requireUser() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return { supabase, userId: user.id };
}

function packNote(label: string, sid: string | null): string | null {
  const clean = label.trim();
  if (!clean && !sid) return null;
  return JSON.stringify({ label: clean, sid: sid || null });
}

export async function logSitAction(minutes: number, label: string, sid: string | null) {
  const min = Math.max(1, Math.round(minutes));
  const { supabase, userId } = await requireUser();
  await supabase.from("daily_trackers").insert({
    user_id: userId,
    tracker_type: TYPE,
    value: min,
    note: packNote(label, sid),
  });
  revalidatePath(PATH);
}

export async function editSitAction(id: number, minutes: number, label: string, sid: string | null) {
  const min = Math.max(1, Math.round(minutes));
  const { supabase, userId } = await requireUser();
  await supabase
    .from("daily_trackers")
    .update({ value: min, note: packNote(label, sid) })
    .eq("id", id)
    .eq("user_id", userId)
    .eq("tracker_type", TYPE);
  revalidatePath(PATH);
}

export async function deleteSitAction(id: number) {
  const { supabase, userId } = await requireUser();
  await supabase
    .from("daily_trackers")
    .delete()
    .eq("id", id)
    .eq("user_id", userId)
    .eq("tracker_type", TYPE);
  revalidatePath(PATH);
}

export async function setGoalAction(minutes: number) {
  const goal = Math.max(5, Math.min(120, Math.round(minutes)));
  const { supabase, userId } = await requireUser();
  // One config row per user; upsert by hand (no unique constraint to rely on).
  const { data: existing } = await supabase
    .from("daily_trackers")
    .select("id")
    .eq("user_id", userId)
    .eq("tracker_type", GOAL_TYPE)
    .limit(1);
  if (existing && existing.length > 0) {
    await supabase
      .from("daily_trackers")
      .update({ value: goal })
      .eq("id", existing[0].id)
      .eq("user_id", userId);
  } else {
    await supabase
      .from("daily_trackers")
      .insert({ user_id: userId, tracker_type: GOAL_TYPE, value: goal });
  }
  revalidatePath(PATH);
}
