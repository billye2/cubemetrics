import "server-only";
import { todayKey } from "@/lib/xp/tz";
import { presenceToday } from "../lib";
import type { SpineAdapter } from "../types";

// Read-only adapter: daily gratitude entry (logs, log_type "gratitude", presence for today).
// A daily practice like journaling — the nudge is writing today's note.
export const adapter: SpineAdapter = {
  appId: "gratitude",
  async today(ctx) {
    const today = todayKey(ctx.tz, ctx.now);
    const { data } = await ctx.supabase
      .from("logs")
      .select("id")
      .eq("user_id", ctx.userId)
      .eq("log_type", "gratitude")
      .eq("entry_date", today)
      .limit(1);
    const logged = (data ?? []).length > 0;
    return presenceToday("gratitude", logged, "Note today's gratitude", "Gratitude noted");
  },
};
