import "server-only";
import { todayKey, addDays } from "@/lib/xp/tz";
import { countdownToday } from "../lib";
import type { SpineAdapter } from "../types";

// Read-only adapter: countdowns whose next occurrence lands within 7 days.
// Recurring-yearly targets roll their MM-DD forward — so the full set is scanned.
export const adapter: SpineAdapter = {
  appId: "countdown",
  async today(ctx) {
    const today = todayKey(ctx.tz, ctx.now);
    const soon = addDays(today, 7);
    const { data } = await ctx.supabase
      .from("countdowns")
      .select("id, title, target_date, recurring_yearly")
      .eq("user_id", ctx.userId);
    const rows = (data ?? []) as {
      id: number;
      title: string;
      target_date: string;
      recurring_yearly: boolean;
    }[];
    return countdownToday(rows, today, soon);
  },
};
