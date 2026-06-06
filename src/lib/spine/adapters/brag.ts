import "server-only";
import { todayKey, addDays } from "@/lib/xp/tz";
import { weeklyCountToday } from "../lib";
import type { SpineAdapter } from "../types";

// A soft weekly cadence — gentle encouragement toward review-season notes, never a nag.
const WEEKLY_TARGET = 3;

// Read-only adapter: wins logged in the trailing 7 days (logs, log_type "brag"). Wins aren't
// a daily obligation, so a zero week shows no card — this surface celebrates, it doesn't pester.
export const adapter: SpineAdapter = {
  appId: "brag",
  async today(ctx) {
    const today = todayKey(ctx.tz, ctx.now);
    const weekStart = addDays(today, -6); // trailing 7-day window incl. today
    const { data } = await ctx.supabase
      .from("logs")
      .select("id")
      .eq("user_id", ctx.userId)
      .eq("log_type", "brag")
      .gte("entry_date", weekStart);
    const count = (data ?? []).length;
    return count > 0 ? weeklyCountToday("brag", count, WEEKLY_TARGET, "win") : null;
  },
};
