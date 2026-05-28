"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabase } from "@/lib/supabase/server";

async function requireUser() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return { supabase, userId: user.id };
}

export async function startSessionAction(duration: number, label: string) {
  const { supabase, userId } = await requireUser();
  // Cancel any existing incomplete session first
  await supabase
    .from("pomodoro_sessions")
    .delete()
    .eq("user_id", userId)
    .eq("completed", false);
  await supabase.from("pomodoro_sessions").insert({
    user_id: userId,
    started_at: new Date().toISOString(),
    duration_minutes: duration,
    label,
  });
  revalidatePath("/app/pomodoro");
}

export async function completeSessionAction(id: number) {
  const { supabase, userId } = await requireUser();
  await supabase
    .from("pomodoro_sessions")
    .update({ completed: true, completed_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", userId);
  revalidatePath("/app/pomodoro");
}

export async function cancelSessionAction(id: number) {
  const { supabase, userId } = await requireUser();
  await supabase.from("pomodoro_sessions").delete().eq("id", id).eq("user_id", userId);
  revalidatePath("/app/pomodoro");
}
