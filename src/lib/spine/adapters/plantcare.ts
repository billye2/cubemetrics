import "server-only";
import { todayKey, addDays } from "@/lib/xp/tz";
import { plantcareToday } from "../lib";
import type { SpineAdapter } from "../types";

// Read-only adapter: plants needing water now, overdue, or within the next 7 days.
// next_due = last_watered + frequency_days; never-watered = due now.
export const adapter: SpineAdapter = {
  appId: "plantcare",
  async today(ctx) {
    const today = todayKey(ctx.tz, ctx.now);
    const soon = addDays(today, 7);
    const { data } = await ctx.supabase
      .from("plants")
      .select("id, name, frequency_days, last_watered")
      .eq("user_id", ctx.userId);
    const rows = (data ?? []) as {
      id: number;
      name: string;
      frequency_days: number;
      last_watered: string | null;
    }[];
    if (rows.length === 0) return null;
    const result = plantcareToday(rows, today, soon);
    return result.count > 0 ? result : null;
  },
};
