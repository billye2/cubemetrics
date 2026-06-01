import "server-only";
import { todayKey } from "@/lib/xp/tz";
import { habitsToday } from "../lib";
import type { SpineAdapter } from "../types";

type Habit = { id: number; name: string };

export const adapter: SpineAdapter = {
  appId: "habits",
  async today(ctx) {
    const today = todayKey(ctx.tz, ctx.now);
    const { data: habits } = await ctx.supabase
      .from("habits")
      .select("id, name")
      .eq("user_id", ctx.userId)
      .eq("active", true);
    const hs = (habits ?? []) as Habit[];
    if (hs.length === 0) return null;
    const { data: checks } = await ctx.supabase
      .from("habit_checkins")
      .select("habit_id")
      .eq("user_id", ctx.userId)
      .eq("checkin_date", today);
    const checkedIds = new Set<number>((checks ?? []).map((c) => c.habit_id as number));
    return habitsToday(hs, checkedIds, today);
  },
};
