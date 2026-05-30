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

const PATH = "/app/savings";

function cleanAmount(v: number): number {
  return Number.isFinite(v) ? Math.round(v * 100) / 100 : 0;
}

function cleanDate(d: string | null | undefined): string | null {
  if (!d) return null;
  return /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : null;
}

/** Verify the goal belongs to this user (and is a savings goal). */
async function ownsGoal(
  supabase: Awaited<ReturnType<typeof requireUser>>["supabase"],
  userId: string,
  goalId: number
): Promise<boolean> {
  const { data } = await supabase
    .from("goals")
    .select("id")
    .eq("id", goalId)
    .eq("user_id", userId)
    .eq("goal_type", "savings")
    .maybeSingle();
  return !!data;
}

export async function createGoal(
  title: string,
  targetValue: number,
  dueDate: string | null
) {
  const trimmed = title.trim();
  if (!trimmed) return;
  const { supabase, userId } = await requireUser();
  const target = cleanAmount(targetValue);
  await supabase.from("goals").insert({
    user_id: userId,
    goal_type: "savings",
    title: trimmed.slice(0, 160),
    target_value: target > 0 ? target : null,
    current_value: 0,
    due_date: cleanDate(dueDate),
    status: "active",
  });
  revalidatePath(PATH);
}

export async function updateGoal(
  goalId: number,
  title: string,
  targetValue: number,
  dueDate: string | null
) {
  const trimmed = title.trim();
  if (!trimmed) return;
  const { supabase, userId } = await requireUser();
  const target = cleanAmount(targetValue);
  await supabase
    .from("goals")
    .update({
      title: trimmed.slice(0, 160),
      target_value: target > 0 ? target : null,
      due_date: cleanDate(dueDate),
    })
    .eq("id", goalId)
    .eq("user_id", userId)
    .eq("goal_type", "savings");
  revalidatePath(PATH);
}

export async function deleteGoal(goalId: number) {
  const { supabase, userId } = await requireUser();
  // Contributions cascade via FK ON DELETE CASCADE.
  await supabase
    .from("goals")
    .delete()
    .eq("id", goalId)
    .eq("user_id", userId)
    .eq("goal_type", "savings");
  revalidatePath(PATH);
}

/** Sync goals.current_value to the sum of its contributions so the bar matches. */
async function syncCurrentValue(
  supabase: Awaited<ReturnType<typeof requireUser>>["supabase"],
  userId: string,
  goalId: number
) {
  const { data } = await supabase
    .from("savings_contributions")
    .select("amount")
    .eq("user_id", userId)
    .eq("goal_id", goalId);
  const total = (data || []).reduce((acc, r) => acc + (Number(r.amount) || 0), 0);
  await supabase
    .from("goals")
    .update({ current_value: Math.round(total * 100) / 100 })
    .eq("id", goalId)
    .eq("user_id", userId);
}

export async function addContribution(
  goalId: number,
  amount: number,
  contributedOn: string | null,
  note: string
) {
  const { supabase, userId } = await requireUser();
  const amt = cleanAmount(amount);
  if (amt === 0) return;
  if (!(await ownsGoal(supabase, userId, goalId))) return;
  await supabase.from("savings_contributions").insert({
    user_id: userId,
    goal_id: goalId,
    amount: amt,
    contributed_on: cleanDate(contributedOn) ?? new Date().toISOString().slice(0, 10),
    note: note.trim().slice(0, 280),
  });
  await syncCurrentValue(supabase, userId, goalId);
  revalidatePath(PATH);
}

export async function deleteContribution(id: number, goalId: number) {
  const { supabase, userId } = await requireUser();
  await supabase
    .from("savings_contributions")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);
  await syncCurrentValue(supabase, userId, goalId);
  revalidatePath(PATH);
}
