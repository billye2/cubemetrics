import "server-only";
import { todayKey } from "@/lib/xp/tz";
import { getApp } from "@/lib/modern/catalog";
import { trackerLimitToday } from "../lib";
import type { SpineAdapter } from "../types";

const limit = () => getApp("caffeine")?.config?.dailyGoal ?? 400;

// Read-only adapter: caffeine logged today vs the daily limit (daily_trackers sum). Unlike
// water/steps, this is an "at-most" limit — over goes red, and nothing-logged shows no card.
export const adapter: SpineAdapter = {
  appId: "caffeine",
  async today(ctx) {
    const today = todayKey(ctx.tz, ctx.now);
    const { data } = await ctx.supabase
      .from("daily_trackers")
      .select("value")
      .eq("user_id", ctx.userId)
      .eq("tracker_type", "caffeine")
      .eq("entry_date", today);
    return trackerLimitToday("caffeine", (data ?? []) as { value: number | null }[], limit(), "mg");
  },
};
