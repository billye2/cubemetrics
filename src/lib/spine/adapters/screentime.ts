import "server-only";
import { todayKey } from "@/lib/xp/tz";
import { getApp } from "@/lib/modern/catalog";
import { trackerLimitToday } from "../lib";
import type { SpineAdapter } from "../types";

const limit = () => getApp("screentime")?.config?.dailyGoal ?? 2;

// Read-only adapter: screen hours today vs the daily limit (daily_trackers sum). An
// "at-most" limit like caffeine — over goes red, nothing-logged shows no card.
export const adapter: SpineAdapter = {
  appId: "screentime",
  async today(ctx) {
    const today = todayKey(ctx.tz, ctx.now);
    const { data } = await ctx.supabase
      .from("daily_trackers")
      .select("value")
      .eq("user_id", ctx.userId)
      .eq("tracker_type", "screentime")
      .eq("entry_date", today);
    return trackerLimitToday("screentime", (data ?? []) as { value: number | null }[], limit(), "hours");
  },
};
