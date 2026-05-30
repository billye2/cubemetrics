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

const MONTH_RE = /^\d{4}-\d{2}-01$/;

/** First day of the current month, used as the default/fallback target month. */
function currentMonthISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

/**
 * Set (or clear) the planned monthly budget for a category. A value <= 0
 * removes the target row entirely so the category shows as "unbudgeted"
 * rather than "$0 planned". One row per (user, category, month).
 */
export async function setBudgetTargetAction(formData: FormData) {
  const category = String(formData.get("category") || "").trim().slice(0, 40);
  if (!category) return;

  const monthRaw = String(formData.get("month") || "").trim();
  const month = MONTH_RE.test(monthRaw) ? monthRaw : currentMonthISO();

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
