import "server-only";
import { todayKey, addDays } from "@/lib/xp/tz";
import { billsToday } from "../lib";
import type { SpineAdapter } from "../types";

// Read-only adapter: unpaid bills due within 7 days (or overdue). No quickLog
// (a bill needs name+amount+date — too lossy for one capture line in v1).
export const adapter: SpineAdapter = {
  appId: "bills",
  async today(ctx) {
    const today = todayKey(ctx.tz, ctx.now);
    const soon = addDays(today, 7);
    const { data } = await ctx.supabase
      .from("finance_items")
      .select("id, name, amount, due_date")
      .eq("user_id", ctx.userId)
      .eq("item_type", "bill")
      .eq("paid", false);
    const rows = (data ?? []) as { id: number; name: string; amount: number; due_date: string | null }[];
    const result = billsToday(rows, today, soon);
    return result.count > 0 ? result : null;
  },
};
