"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabase } from "@/lib/supabase/server";
import { isMonthISO, monthStartISO, prevMonthStartISO } from "./lib";

async function requireUser() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return { supabase, userId: user.id };
}

/** First day of the current month, used as the default/fallback target month. */
function currentMonthISO(): string {
  return monthStartISO();
}

function normalizeMonth(raw: unknown): string {
  const s = String(raw || "").trim();
  return isMonthISO(s) ? s : currentMonthISO();
}

/**
 * Set (or clear) the planned monthly budget for a category. A value <= 0
 * removes the target row entirely so the category shows as "unbudgeted"
 * rather than "$0 planned". One row per (user, category, month).
 */
export async function setBudgetTargetAction(formData: FormData) {
  const category = String(formData.get("category") || "").trim().slice(0, 40);
  if (!category) return;

  const month = normalizeMonth(formData.get("month"));

  const plannedRaw = String(formData.get("planned") || "").trim();
  const planned = Number(plannedRaw);
  if (!Number.isFinite(planned) || planned < 0) return;

  const { supabase, userId } = await requireUser();

  if (planned <= 0) {
    await supabase
      .from("budget_targets")
      .delete()
      .eq("user_id", userId)
      .eq("category", category)
      .eq("month", month);
  } else {
    await supabase.from("budget_targets").upsert(
      { user_id: userId, category, planned, month },
      { onConflict: "user_id,category,month" },
    );
  }

  revalidatePath("/app/budget");
}

/**
 * Copy the previous month's planned amounts into `month` (monthly reset, P2).
 * When `rollover` is set, the unspent remainder from the previous month is
 * added to each category's allowance (planned − spent, never below 0 extra).
 * Only fills categories that don't already have a target this month, so it's
 * safe to run again without clobbering edits.
 */
export async function copyForwardAction(formData: FormData) {
  const month = normalizeMonth(formData.get("month"));
  const rollover = String(formData.get("rollover") || "") === "1";
  const prevMonth = prevMonthStartISO(month);

  const { supabase, userId } = await requireUser();

  const [{ data: prevTargets }, { data: existing }] = await Promise.all([
    supabase
      .from("budget_targets")
      .select("category, planned")
      .eq("user_id", userId)
      .eq("month", prevMonth),
    supabase
      .from("budget_targets")
      .select("category")
      .eq("user_id", userId)
      .eq("month", month),
  ]);

  if (!prevTargets || prevTargets.length === 0) {
    revalidatePath("/app/budget");
    return;
  }

  const already = new Set((existing || []).map((r) => r.category as string));

  // For rollover we need last month's actual spend per category.
  let spentByCat = new Map<string, number>();
  if (rollover) {
    const nextOfPrev = month; // prevMonth's next month *is* `month`
    const { data: prevExpenses } = await supabase
      .from("expenses")
      .select("amount, category")
      .eq("user_id", userId)
      .gte("expense_date", prevMonth)
      .lt("expense_date", nextOfPrev);
    for (const e of prevExpenses || []) {
      const cat = e.category as string;
      spentByCat.set(cat, (spentByCat.get(cat) || 0) + (Number(e.amount) || 0));
    }
  }

  const rows = prevTargets
    .filter((t) => !already.has(t.category as string))
    .map((t) => {
      const category = t.category as string;
      const base = Number(t.planned) || 0;
      let planned = base;
      if (rollover) {
        const unspent = base - (spentByCat.get(category) || 0);
        if (unspent > 0) planned = base + unspent;
      }
      return { user_id: userId, category, planned, month };
    })
    .filter((r) => r.planned > 0);

  if (rows.length > 0) {
    await supabase
      .from("budget_targets")
      .upsert(rows, { onConflict: "user_id,category,month" });
  }

  revalidatePath("/app/budget");
}
