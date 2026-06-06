import "server-only";
import { todayKey } from "@/lib/xp/tz";
import { presenceToday } from "../lib";
import type { SpineAdapter } from "../types";

// Read-only adapter: daily weight check-in (daily_trackers presence for today).
export const adapter: SpineAdapter = {
  appId: "weight",
  async today(ctx) {
    const today = todayKey(ctx.tz, ctx.now);
    const { data } = await ctx.supabase
      .from("daily_trackers")
      .select("id")
      .eq("user_id", ctx.userId)
      .eq("tracker_type", "weight")
      .eq("entry_date", today)
      .limit(1);
    const logged = (data ?? []).length > 0;
    return presenceToday("weight", logged, "Log today's weight", "Weight logged");
  },
};
