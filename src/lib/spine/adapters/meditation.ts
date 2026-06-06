import "server-only";
import { todayKey } from "@/lib/xp/tz";
import { getApp } from "@/lib/modern/catalog";
import { trackerSumToday } from "../lib";
import type { SpineAdapter } from "../types";

const goal = () => getApp("meditation")?.config?.dailyGoal ?? 20;

// Read-only adapter: minutes meditated today vs the daily goal (daily_trackers sum).
export const adapter: SpineAdapter = {
  appId: "meditation",
  async today(ctx) {
    const today = todayKey(ctx.tz, ctx.now);
    const { data } = await ctx.supabase
      .from("daily_trackers")
      .select("value")
      .eq("user_id", ctx.userId)
      .eq("tracker_type", "meditation")
      .eq("entry_date", today);
    // Always show the card (the "0/20 min" zero-state IS the nudge), like water.
    return trackerSumToday("meditation", (data ?? []) as { value: number | null }[], goal(), "min");
  },
};
