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
