"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabase } from "@/lib/supabase/server";

async function requireUser() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return { supabase, userId: user.id };
}

export async function saveFocusSessionAction(
  minutes: number,
  intent: string,
  distractions: string[],
) {
  const rounded = Math.round(minutes);
  if (rounded <= 0) return;
  const { supabase, userId } = await requireUser();
  const cleaned = distractions.map((d) => d.trim()).filter(Boolean);
  await supabase.from("daily_trackers").insert({
    user_id: userId,
    tracker_type: "focus",
    value: rounded,
    label: intent.trim() || null,
    note: cleaned.length > 0 ? cleaned.join(" | ") : null,
  });
  revalidatePath("/app/focus");
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
