import "server-only";
import { todayKey, addDays } from "@/lib/xp/tz";
import { scheduleToday } from "../lib";
import type { SpineAdapter } from "../types";

// Read-only adapter: vehicle services due now, overdue, or within the next 7 days.
// Same schedule_items pattern as medication (next_due = last_done + interval_days).
export const adapter: SpineAdapter = {
  appId: "carcare",
  async today(ctx) {
    const today = todayKey(ctx.tz, ctx.now);
    const soon = addDays(today, 7);
    const { data } = await ctx.supabase
      .from("schedule_items")
      .select("id, title, interval_days, last_done")
      .eq("user_id", ctx.userId)
      .eq("schedule_type", "carcare");
    const rows = (data ?? []) as {
      id: number;
      title: string;
      interval_days: number;
      last_done: string | null;
    }[];
    if (rows.length === 0) return null;
    const result = scheduleToday("carcare", rows, today, soon);
    return result.count > 0 ? result : null;
  },
};
