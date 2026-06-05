import "server-only";
import { todayKey } from "@/lib/xp/tz";
import { goalsToday } from "../lib";
import type { SpineAdapter } from "../types";

// Read-only adapter: active goals, severity by deadline, with average progress.
// goal_type "smart" is the Goals app's discriminator on the shared `goals` table.
// Completed goals are filtered in goalsToday() (keeps the query mock-friendly — no .neq).
export const adapter: SpineAdapter = {
  appId: "goals",
  async today(ctx) {
    const today = todayKey(ctx.tz, ctx.now);
    const { data } = await ctx.supabase
      .from("goals")
      .select("id, title, target_value, current_value, due_date, status")
      .eq("user_id", ctx.userId)
      .eq("goal_type", "smart");
    const rows = (data ?? []) as {
      id: number;
      title: string;
      target_value: number | null;
      current_value: number | null;
      due_date: string | null;
      status: string;
    }[];
    if (rows.length === 0) return null;
    return goalsToday(rows, today);
  },
};
