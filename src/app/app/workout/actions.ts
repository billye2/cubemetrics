"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabase } from "@/lib/supabase/server";

const PATH = "/app/workout";

async function requireUser() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return { supabase, userId: user.id };
}

export async function addSessionAction(title: string, performedOn: string, note: string) {
  const trimmed = title.trim();
  if (!trimmed) return;
  const { supabase, userId } = await requireUser();
  const payload: Record<string, unknown> = {
    user_id: userId,
    title: trimmed,
    note: note.trim() || null,
  };
  if (performedOn) payload.performed_on = performedOn;
  await supabase.from("workout_sessions").insert(payload);
  revalidatePath(PATH);
}

export async function deleteSessionAction(id: number) {
  const { supabase, userId } = await requireUser();
  await supabase.from("workout_sessions").delete().eq("id", id).eq("user_id", userId);
  revalidatePath(PATH);
}

export async function addSetAction(
  sessionId: number,
  exercise: string,
  reps: number | null,
  weight: number | null,
) {
  const trimmed = exercise.trim();
  if (!trimmed) return;
  const { supabase, userId } = await requireUser();
  await supabase.from("workout_sets").insert({
    user_id: userId,
    session_id: sessionId,
    exercise: trimmed,
    reps,
    weight,
  });
  revalidatePath(PATH);
}

export async function deleteSetAction(id: number) {
  const { supabase, userId } = await requireUser();
  await supabase.from("workout_sets").delete().eq("id", id).eq("user_id", userId);
  revalidatePath(PATH);
}
