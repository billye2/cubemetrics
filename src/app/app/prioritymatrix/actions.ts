"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabase } from "@/lib/supabase/server";

async function requireUser() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return { supabase, userId: user.id };
}

const PATH = "/app/prioritymatrix";

function cleanQuadrant(q: number): number {
  return q >= 0 && q <= 4 ? Math.floor(q) : 0;
}

/** Add a task straight into the matrix (default: unsorted). Shared with Todo. */
export async function addTask(title: string, quadrant: number) {
  const trimmed = title.trim();
  if (!trimmed) return;
  const { supabase, userId } = await requireUser();
  await supabase
    .from("todos")
    .insert({ user_id: userId, title: trimmed.slice(0, 200), quadrant: cleanQuadrant(quadrant) });
  revalidatePath(PATH);
}

export async function setQuadrant(id: number, quadrant: number) {
  const { supabase, userId } = await requireUser();
  await supabase
    .from("todos")
    .update({ quadrant: cleanQuadrant(quadrant) })
    .eq("id", id)
    .eq("user_id", userId);
  revalidatePath(PATH);
}

export async function completeTask(id: number) {
  const { supabase, userId } = await requireUser();
  await supabase
    .from("todos")
    .update({ completed: true, completed_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", userId);
  revalidatePath(PATH);
}

export async function deleteTask(id: number) {
  const { supabase, userId } = await requireUser();
  await supabase.from("todos").delete().eq("id", id).eq("user_id", userId);
  revalidatePath(PATH);
}
