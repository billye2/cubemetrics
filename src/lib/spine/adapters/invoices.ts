import "server-only";
import { todayKey, addDays } from "@/lib/xp/tz";
import { financeDueToday } from "../lib";
import type { SpineAdapter } from "../types";

// Read-only adapter: unpaid invoices due within 7 days (or overdue) — money to collect.
export const adapter: SpineAdapter = {
  appId: "invoices",
  async today(ctx) {
    const today = todayKey(ctx.tz, ctx.now);
    const soon = addDays(today, 7);
    const { data } = await ctx.supabase
      .from("finance_items")
      .select("id, name, amount, due_date")
      .eq("user_id", ctx.userId)
      .eq("item_type", "invoice")
      .eq("paid", false);
    const rows = (data ?? []) as { id: number; name: string; amount: number; due_date: string | null }[];
    const result = financeDueToday("invoices", rows, today, soon);
    return result.count > 0 ? result : null;
  },
};
