"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabase } from "@/lib/supabase/server";
import { cleanConfidence, cleanKrType, currentCycle, nextCycle } from "./lib";

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

// --- End-of-cycle grading (P2) ---------------------------------------------

/** Close an objective: snapshot a reflection and archive it out of the active view. */
export async function gradeObjective(id: number, reflection: string) {
  const { supabase, userId } = await requireUser();
  await supabase
    .from("objectives")
    .update({
      status: "graded",
      reflection: reflection.trim().slice(0, 2000),
      graded_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", userId);
  revalidatePath(PATH);
}

/** Re-open a graded objective for further work. */
export async function reopenObjective(id: number) {
  const { supabase, userId } = await requireUser();
  await supabase
    .from("objectives")
    .update({ status: "active", graded_at: null })
    .eq("id", id)
    .eq("user_id", userId);
  revalidatePath(PATH);
}

// --- Key results -----------------------------------------------------------

export async function addKeyResult(
  objectiveId: number,
  title: string,
  type: string,
  startValue: number,
  target: number,
) {
  const t = title.trim();
  if (!t) return;
  const { supabase, userId } = await requireUser();
  if (!(await ownsObjective(supabase, userId, objectiveId))) return;

  const krType = cleanKrType(type);
  const start = krType === "baseline" ? cleanNumber(startValue, 0) : 0;
  const targetValue =
    krType === "milestone" ? 1 : cleanNumber(target, 100);
  const current = krType === "baseline" ? start : 0;

  await supabase.from("key_results").insert({
    user_id: userId,
    objective_id: objectiveId,
    title: t.slice(0, 200),
    kr_type: krType,
    start_value: start,
    current_value: current,
    target_value: targetValue,
  });
  revalidatePath(PATH);
}

/** Log a KR's new value to its history (P3 sparkline source). */
async function logProgress(
  supabase: Awaited<ReturnType<typeof requireUser>>["supabase"],
  userId: string,
  krId: number,
  value: number,
) {
  await supabase
    .from("kr_progress")
    .insert({ user_id: userId, key_result_id: krId, value });
}

export async function updateKeyResult(
  krId: number,
  current: number,
  target: number,
) {
  const { supabase, userId } = await requireUser();
  const value = cleanNumber(current, 0);
  const { data } = await supabase
    .from("key_results")
    .update({
      current_value: value,
      target_value: cleanNumber(target, 100),
    })
    .eq("id", krId)
    .eq("user_id", userId)
    .select("id")
    .maybeSingle();
  if (data) await logProgress(supabase, userId, krId, value);
  revalidatePath(PATH);
}

/** Set a KR's current value directly (used by increment buttons / milestone toggle). */
export async function setKeyResultValue(krId: number, current: number) {
  const { supabase, userId } = await requireUser();
  const value = cleanNumber(current, 0);
  const { data } = await supabase
    .from("key_results")
    .update({ current_value: value })
    .eq("id", krId)
    .eq("user_id", userId)
    .select("id")
    .maybeSingle();
  if (data) await logProgress(supabase, userId, krId, value);
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

// --- Carry-over (P3) -------------------------------------------------------

/**
 * Copy an incomplete KR into a fresh objective in the next cycle. If a sibling
 * objective with the same title already exists in the next cycle it's reused,
 * otherwise one is created. The KR's progress resets (baseline keeps its span).
 */
export async function carryOverKeyResult(krId: number) {
  const { supabase, userId } = await requireUser();

  const { data: kr } = await supabase
    .from("key_results")
    .select(
      "id, objective_id, title, kr_type, start_value, target_value, current_value",
    )
    .eq("id", krId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!kr) return;

  const { data: srcObj } = await supabase
    .from("objectives")
    .select("id, title, cycle, confidence")
    .eq("id", kr.objective_id)
    .eq("user_id", userId)
    .maybeSingle();
  if (!srcObj) return;

  const target = nextCycle((srcObj.cycle as string) ?? "");

  // Find or create the matching objective in the next cycle.
  let destId: number | null = null;
  const { data: existing } = await supabase
    .from("objectives")
    .select("id")
    .eq("user_id", userId)
    .eq("title", srcObj.title)
    .eq("cycle", target)
    .maybeSingle();
  if (existing) {
    destId = existing.id as number;
  } else {
    const { data: created } = await supabase
      .from("objectives")
      .insert({
        user_id: userId,
        title: srcObj.title,
        cycle: target,
        confidence: "on_track",
      })
      .select("id")
      .maybeSingle();
    destId = (created?.id as number) ?? null;
  }
  if (!destId) return;

  const krType = cleanKrType((kr.kr_type as string) ?? "metric");
  const start = Number(kr.start_value) || 0;
  await supabase.from("key_results").insert({
    user_id: userId,
    objective_id: destId,
    title: kr.title,
    kr_type: krType,
    start_value: start,
    current_value: krType === "baseline" ? start : 0,
    target_value: Number(kr.target_value) || 100,
  });
  revalidatePath(PATH);
}
