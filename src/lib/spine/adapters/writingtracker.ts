import "server-only";
import { todayKey } from "@/lib/xp/tz";
import { getApp } from "@/lib/modern/catalog";
import { trackerSumToday } from "../lib";
import type { SpineAdapter } from "../types";

const goal = () => getApp("writingtracker")?.config?.dailyGoal ?? 500;

// Read-only adapter: words written today vs the daily goal (daily_trackers sum), like water.
// NB the tracker_type is "writing" (not the app id), per the catalog config.
export const adapter: SpineAdapter = {
  appId: "writingtracker",
  async today(ctx) {
    const today = todayKey(ctx.tz, ctx.now);
    const { data } = await ctx.supabase
      .from("daily_trackers")
      .select("value")
      .eq("user_id", ctx.userId)
      .eq("tracker_type", "writing")
      .eq("entry_date", today);
    return trackerSumToday("writingtracker", (data ?? []) as { value: number | null }[], goal(), "words");
  },
};
