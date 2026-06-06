import "server-only";
import { todayKey, addDays } from "@/lib/xp/tz";
import { weeklyCountToday } from "../lib";
import type { SpineAdapter } from "../types";

// A soft weekly cadence — encouragement, not a nag (rest days don't go red).
const WEEKLY_TARGET = 4;

// Read-only adapter: workout sessions logged in the trailing 7 days (workout_sessions).
export const adapter: SpineAdapter = {
  appId: "workout",
  async today(ctx) {
    const today = todayKey(ctx.tz, ctx.now);
    const weekStart = addDays(today, -6); // trailing 7-day window incl. today
    const { data } = await ctx.supabase
      .from("workout_sessions")
      .select("id")
      .eq("user_id", ctx.userId)
      .gte("performed_on", weekStart);
    return weeklyCountToday("workout", (data ?? []).length, WEEKLY_TARGET, "workout");
  },
};
