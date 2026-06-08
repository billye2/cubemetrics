"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabase } from "@/lib/supabase/server";

async function requireUser() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return { supabase, userId: user.id };
}

// The reflection (what got done), the 1–5 focus rating, and the optional
// "done looks like" criteria are packed into the tracker's `note` column as
// JSON. `value` stays the duration in minutes (read by xp + weekly review).
export interface FocusNote {
  win: string;
  rating: number;
  done?: string;
}

export async function saveFocusSessionAction(
  minutes: number,
  intent: string,
  win: string,
  rating: number,
  done?: string,
) {
  const rounded = Math.round(minutes);
  if (rounded <= 0) return;
  const { supabase, userId } = await requireUser();

  const note: FocusNote = {
    win: win.trim() || "Showed up and put in the time.",
    rating: Math.min(5, Math.max(1, Math.round(rating) || 3)),
  };
  const doneTrimmed = done?.trim();
  if (doneTrimmed) note.done = doneTrimmed;

  await supabase.from("daily_trackers").insert({
    user_id: userId,
    tracker_type: "focus",
    value: rounded,
    label: intent.trim() || null,
    note: JSON.stringify(note),
  });
  revalidatePath("/app/focus");
  revalidatePath("/today");
}

export async function deleteFocusEntryAction(id: number) {
  const { supabase, userId } = await requireUser();
  await supabase
    .from("daily_trackers")
    .delete()
    .eq("id", id)
    .eq("user_id", userId)
    .eq("tracker_type", "focus");
  revalidatePath("/app/focus");
}
