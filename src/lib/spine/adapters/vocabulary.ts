import "server-only";
import { todayKey } from "@/lib/xp/tz";
import { srsDueToday } from "../lib";
import type { SpineAdapter } from "../types";

// Read-only adapter: vocabulary words whose spaced-repetition review date has arrived.
export const adapter: SpineAdapter = {
  appId: "vocabulary",
  async today(ctx) {
    const today = todayKey(ctx.tz, ctx.now);
    const { data } = await ctx.supabase
      .from("vocab_words")
      .select("id")
      .eq("user_id", ctx.userId)
      .lte("due_date", today);
    return srsDueToday("vocabulary", (data ?? []).length, "word");
  },
};
