import "server-only";
import { todayKey } from "@/lib/xp/tz";
import { presenceToday } from "../lib";
import type { SpineAdapter } from "../types";

// Read-only adapter: daily stress check-in (daily_trackers presence for today). Stress is
// rated (no daily goal to sum toward), so the nudge is the logging itself, like mood.
export const adapter: SpineAdapter = {
  appId: "stress",
  async today(ctx) {
    const today = todayKey(ctx.tz, ctx.now);
    const { data } = await ctx.supabase
      .from("daily_trackers")
      .select("id")
      .eq("user_id", ctx.userId)
      .eq("tracker_type", "stress")
      .eq("entry_date", today)
      .limit(1);
    const logged = (data ?? []).length > 0;
    return presenceToday("stress", logged, "Log today's stress", "Stress logged");
  },
};
