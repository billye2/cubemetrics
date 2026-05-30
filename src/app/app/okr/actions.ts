"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabase } from "@/lib/supabase/server";
import { cleanConfidence, currentCycle } from "./lib";

async function requireUser() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return { supabase, userId: user.id };
}

const PATH = "/app/okr";

/** Verify an objective belongs to the caller before mutating its key results. */
async function ownsObjective(
  supabase: Awaited<ReturnType<typeof requireUser>>["supabase"],
  userId: string,
  objectiveId: number,
): Promise<boolean> {
  const { data } = await supabase
    .from("objectives")
    .select("id")
    .eq("id", objectiveId)
    .eq("user_id", userId)
    .maybeSingle();
  return Boolean(data);
}

function cleanNumber(value: unknown, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export async function addObjective(title: string, cycle?: string) {
  const t = title.trim();
  if (!t) return;
  const { supabase, userId } = await requireUser();
  await supabase.from("objectives").insert({
    user_id: userId,
    title: t.slice(0, 200),
    cycle: (cycle?.trim() || currentCycle()).slice(0, 40),
  });
  revalidatePath(PATH);
}

export async function setObjectiveTitle(id: number, title: string) {
  const t = title.trim();
  if (!t) return;
  const { supabase, userId } = await requireUser();
  await supabase
    .from("objectives")
    .update({ title: t.slice(0, 200) })
    .eq("id", id)
    .eq("user_id", userId);
  revalidatePath(PATH);
}

export async function setCycle(id: number, cycle: string) {
  const { supabase, userId } = await requireUser();
  await supabase
    .from("objectives")
    .update({ cycle: cycle.trim().slice(0, 40) })
    .eq("id", id)
    .eq("user_id", userId);
  revalidatePath(PATH);
}

export async function setConfidence(id: number, confidence: string) {
  const { supabase, userId } = await requireUser();
  await supabase
    .from("objectives")
    .update({ confidence: cleanConfidence(confidence) })
    .eq("id", id)
    .eq("user_id", userId);
  revalidatePath(PATH);
}

export async function deleteObjective(id: number) {
  const { supabase, userId } = await requireUser();
  // key_results cascade via FK on delete.
  await supabase.from("objectives").delete().eq("id", id).eq("user_id", userId);
  revalidatePath(PATH);
}

export async function addKeyResult(
  objectiveId: number,
  title: string,
  target: number,
) {
  const t = title.trim();
  if (!t) return;
  const { supabase, userId } = await requireUser();
  if (!(await ownsObjective(supabase, userId, objectiveId))) return;
  await supabase.from("key_results").insert({
    user_id: userId,
    objective_id: objectiveId,
    title: t.slice(0, 200),
    current_value: 0,
    target_value: cleanNumber(target, 100),
  });
  revalidatePath(PATH);
}

export async function updateKeyResult(
  krId: number,
  current: number,
  target: number,
) {
  const { supabase, userId } = await requireUser();
  await supabase
    .from("key_results")
    .update({
      current_value: cleanNumber(current, 0),
      target_value: cleanNumber(target, 100),
    })
    .eq("id", krId)
    .eq("user_id", userId);
  revalidatePath(PATH);
}

export async function setKeyResultTitle(krId: number, title: string) {
  const t = title.trim();
  if (!t) return;
  const { supabase, userId } = await requireUser();
  await supabase
    .from("key_results")
    .update({ title: t.slice(0, 200) })
    .eq("id", krId)
    .eq("user_id", userId);
  revalidatePath(PATH);
}

export async function deleteKeyResult(krId: number) {
  const { supabase, userId } = await requireUser();
  await supabase.from("key_results").delete().eq("id", krId).eq("user_id", userId);
  revalidatePath(PATH);
}
