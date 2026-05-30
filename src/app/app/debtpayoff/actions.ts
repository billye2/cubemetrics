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

const PATH = "/app/debtpayoff";

function cleanAmount(v: number): number {
  return Number.isFinite(v) && v > 0 ? Math.round(v * 100) / 100 : 0;
}

function cleanRate(v: number): number {
  if (!Number.isFinite(v) || v < 0) return 0;
  return Math.min(1000, Math.round(v * 1000) / 1000);
}

function cleanDate(d: string | null | undefined): string | null {
  if (!d) return null;
  return /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : null;
}

/** Verify the debt belongs to this user. */
async function ownsDebt(
  supabase: Awaited<ReturnType<typeof requireUser>>["supabase"],
  userId: string,
  debtId: number
): Promise<boolean> {
  const { data } = await supabase
    .from("debts")
    .select("id")
    .eq("id", debtId)
    .eq("user_id", userId)
    .maybeSingle();
  return !!data;
}

export async function createDebt(
  name: string,
  originalBalance: number,
  apr: number,
  minPayment: number
) {
  const trimmed = name.trim();
  if (!trimmed) return;
  const { supabase, userId } = await requireUser();
  const original = cleanAmount(originalBalance);
  await supabase.from("debts").insert({
    user_id: userId,
    name: trimmed.slice(0, 160),
    original_balance: original,
    current_balance: original,
    apr: cleanRate(apr),
    min_payment: cleanAmount(minPayment),
    status: "active",
  });
  revalidatePath(PATH);
}

export async function updateDebt(
  debtId: number,
  name: string,
  originalBalance: number,
  apr: number,
  minPayment: number
) {
  const trimmed = name.trim();
  if (!trimmed) return;
  const { supabase, userId } = await requireUser();
  if (!(await ownsDebt(supabase, userId, debtId))) return;
  await supabase
    .from("debts")
    .update({
      name: trimmed.slice(0, 160),
      original_balance: cleanAmount(originalBalance),
      apr: cleanRate(apr),
      min_payment: cleanAmount(minPayment),
    })
    .eq("id", debtId)
    .eq("user_id", userId);
  // Original balance may have changed → resync the derived current balance.
  await syncBalance(supabase, userId, debtId);
  revalidatePath(PATH);
}

export async function deleteDebt(debtId: number) {
  const { supabase, userId } = await requireUser();
  // Payments cascade via FK ON DELETE CASCADE.
  await supabase.from("debts").delete().eq("id", debtId).eq("user_id", userId);
  revalidatePath(PATH);
}

/** Recompute current_balance = original - SUM(payments), floored at 0, and status. */
async function syncBalance(
  supabase: Awaited<ReturnType<typeof requireUser>>["supabase"],
  userId: string,
  debtId: number
) {
  const [{ data: debt }, { data: pays }] = await Promise.all([
    supabase
      .from("debts")
      .select("original_balance")
      .eq("id", debtId)
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("debt_payments")
      .select("amount")
      .eq("user_id", userId)
      .eq("debt_id", debtId),
  ]);
  if (!debt) return;
  const original = Number(debt.original_balance) || 0;
  const paid = (pays || []).reduce((acc, r) => acc + (Number(r.amount) || 0), 0);
  const balance = Math.max(0, Math.round((original - paid) * 100) / 100);
  await supabase
    .from("debts")
    .update({ current_balance: balance, status: balance <= 0 ? "paid" : "active" })
    .eq("id", debtId)
    .eq("user_id", userId);
}

export async function addPayment(
  debtId: number,
  amount: number,
  paidOn: string | null,
  note: string
) {
  const { supabase, userId } = await requireUser();
  const amt = cleanAmount(amount);
  if (amt === 0) return;
  if (!(await ownsDebt(supabase, userId, debtId))) return;
  await supabase.from("debt_payments").insert({
    user_id: userId,
    debt_id: debtId,
    amount: amt,
    paid_on: cleanDate(paidOn) ?? new Date().toISOString().slice(0, 10),
    note: note.trim().slice(0, 280),
  });
  await syncBalance(supabase, userId, debtId);
  revalidatePath(PATH);
}

export async function deletePayment(id: number, debtId: number) {
  const { supabase, userId } = await requireUser();
  await supabase
    .from("debt_payments")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);
  await syncBalance(supabase, userId, debtId);
  revalidatePath(PATH);
}
