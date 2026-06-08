import "server-only";
import { todayKey } from "@/lib/xp/tz";
import { trackerSumToday } from "../lib";
import type { SpineAdapter } from "../types";

// Soft daily target, in minutes — one solid focus block. Focus is a custom
// (ui:"modern") app with no catalog tracker config, so the goal lives here.
const DAILY_GOAL_MIN = 60;

// Read-only adapter: minutes focused today vs the daily goal (daily_trackers sum,
// tracker_type "focus"; `value` is the session duration). Always shows the card —
// the "0/60 min" zero-state is itself the nudge — like water/meditation. Selection
// still only surfaces it for users who actually use Focus (pinned/recent gating).
export const adapter: SpineAdapter = {
  appId: "focus",
  async today(ctx) {
    const today = todayKey(ctx.tz, ctx.now);
    const { data } = await ctx.supabase
      .from("daily_trackers")
      .select("value")
      .eq("user_id", ctx.userId)
      .eq("tracker_type", "focus")
      .eq("entry_date", today);
    return trackerSumToday("focus", (data ?? []) as { value: number | null }[], DAILY_GOAL_MIN, "min");
  },
};
