import "server-only";
import { todayKey } from "@/lib/xp/tz";
import { budgetToday } from "../lib";
import type { SpineAdapter } from "../types";

// Read-only adapter: this month's spend vs planned. No quickLog (expense capture
// belongs to the `expenses` app), so no match() either.
export const adapter: SpineAdapter = {
  appId: "budget",
  async today(ctx) {
    const today = todayKey(ctx.tz, ctx.now);
    const monthStart = `${today.slice(0, 7)}-01`;
    const { data: targets } = await ctx.supabase
      .from("budget_targets")
      .select("planned")
      .eq("user_id", ctx.userId)
      .eq("month", monthStart);
    const planned = (targets ?? []).reduce((a, t) => a + (Number(t.planned) || 0), 0);
    const { data: exp } = await ctx.supabase
      .from("expenses")
      .select("amount")
      .eq("user_id", ctx.userId)
      .gte("expense_date", monthStart)
      .lte("expense_date", today);
    const spent = (exp ?? []).reduce((a, e) => a + (Number(e.amount) || 0), 0);
    if (planned === 0 && spent === 0) return null;
    return budgetToday(planned, spent);
  },
};
