import "server-only";
import { todayKey } from "@/lib/xp/tz";
import { getApp } from "@/lib/modern/catalog";
import { trackerSumToday } from "../lib";
import type { SpineAdapter } from "../types";

const goal = () => getApp("steps")?.config?.dailyGoal ?? 8000;

// Read-only adapter: steps taken today vs the daily goal (daily_trackers sum), like water.
export const adapter: SpineAdapter = {
  appId: "steps",
  async today(ctx) {
    const today = todayKey(ctx.tz, ctx.now);
    const { data } = await ctx.supabase
      .from("daily_trackers")
      .select("value")
      .eq("user_id", ctx.userId)
      .eq("tracker_type", "steps")
      .eq("entry_date", today);
    // Always show the card (the "0/8000 steps" zero-state IS the nudge).
    return trackerSumToday("steps", (data ?? []) as { value: number | null }[], goal(), "steps");
  },
};
