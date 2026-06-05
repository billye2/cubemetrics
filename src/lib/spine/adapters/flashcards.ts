import "server-only";
import { todayKey } from "@/lib/xp/tz";
import { srsDueToday } from "../lib";
import type { SpineAdapter } from "../types";

// Read-only adapter: flashcards whose spaced-repetition review date has arrived.
export const adapter: SpineAdapter = {
  appId: "flashcards",
  async today(ctx) {
    const today = todayKey(ctx.tz, ctx.now);
    const { data } = await ctx.supabase
      .from("flashcards")
      .select("id")
      .eq("user_id", ctx.userId)
      .lte("due_date", today);
    return srsDueToday("flashcards", (data ?? []).length, "card");
  },
};
