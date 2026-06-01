import "server-only";
import { todayKey } from "@/lib/xp/tz";
import { getApp } from "@/lib/modern/catalog";
import { sumToday } from "../lib";
import type { SpineAdapter } from "../types";

const goal = () => getApp("water")?.config?.dailyGoal ?? 8;

export const adapter: SpineAdapter = {
  appId: "water",
  async today(ctx) {
    const today = todayKey(ctx.tz, ctx.now);
    const { data } = await ctx.supabase
      .from("daily_trackers")
      .select("value")
      .eq("user_id", ctx.userId)
      .eq("tracker_type", "water")
      .eq("entry_date", today);
    // Always show the card (the "0/8" zero-state IS the nudge).
    return sumToday((data ?? []) as { value: number | null }[], goal());
  },
};
