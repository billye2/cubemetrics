"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabase } from "@/lib/supabase/server";

async function requireUser() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return { supabase, userId: user.id };
}

export async function addTimeEntryAction(
  category: string,
  minutes: number,
  note: string,
) {
  const cat = category.trim();
  const rounded = Math.round(minutes);
  if (!cat || rounded <= 0) return;
  const { supabase, userId } = await requireUser();
  await supabase.from("daily_trackers").insert({
    user_id: userId,
    tracker_type: "timetracker",
    value: rounded,
    label: cat,
    note: note.trim() || null,
  });
  revalidatePath("/app/timetracker");
}

export async function deleteTimeEntryAction(id: number) {
  const { supabase, userId } = await requireUser();
  await supabase
    .from("daily_trackers")
    .delete()
    .eq("id", id)
    .eq("user_id", userId)
    .eq("tracker_type", "timetracker");
  revalidatePath("/app/timetracker");
}

// Per-category weekly budget (minutes), one persisted row per (user, category).
// Stored as a "timebudget" tracker row — config, not a time entry — so it's
// excluded from the time-entry queries and from the XP engine (see xp/compute).
// No revalidate: the client tracks targets locally and persists in the background,
// so a stepper tap stays snappy and doesn't refetch the page.
export async function setTimeBudgetAction(category: string, weeklyMinutes: number) {
  const cat = category.trim();
  if (!cat) return;
  const minutes = Math.max(0, Math.round(weeklyMinutes));
  const { supabase, userId } = await requireUser();

  const { data: existing } = await supabase
    .from("daily_trackers")
    .select("id")
    .eq("user_id", userId)
    .eq("tracker_type", "timebudget")
    .eq("label", cat)
    .limit(1)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("daily_trackers")
      .update({ value: minutes })
      .eq("id", existing.id)
      .eq("user_id", userId)
      .eq("tracker_type", "timebudget");
  } else {
    await supabase.from("daily_trackers").insert({
      user_id: userId,
      tracker_type: "timebudget",
      value: minutes,
      label: cat,
      note: null,
    });
  }
}
