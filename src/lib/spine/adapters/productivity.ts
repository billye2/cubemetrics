import "server-only";
import { todayKey } from "@/lib/xp/tz";
import { presenceToday } from "../lib";
import type { SpineAdapter } from "../types";

// Read-only adapter: daily productivity self-rating (daily_trackers presence). Rated, no
// goal to sum toward, so the nudge is the logging itself — like mood/energy/stress.
export const adapter: SpineAdapter = {
  appId: "productivity",
  async today(ctx) {
    const today = todayKey(ctx.tz, ctx.now);
    const { data } = await ctx.supabase
      .from("daily_trackers")
      .select("id")
      .eq("user_id", ctx.userId)
      .eq("tracker_type", "productivity")
      .eq("entry_date", today)
      .limit(1);
    const logged = (data ?? []).length > 0;
    return presenceToday("productivity", logged, "Rate today's productivity", "Productivity rated");
  },
};
