import "server-only";
import { todayKey } from "@/lib/xp/tz";
import { habitsToday, stripPrefix, fuzzyFind } from "../lib";
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
  async quickLog(ctx, input) {
    const today = todayKey(ctx.tz, ctx.now);
    const name = stripPrefix(input, ["habit", "check", "h"]).trim();
    const { data: habits } = await ctx.supabase
      .from("habits")
      .select("id, name")
      .eq("user_id", ctx.userId)
      .eq("active", true);
    const habit = fuzzyFind(name, (habits ?? []) as Habit[], (h) => h.name);
    if (!habit) return { ok: false, appId: "habits", message: `No habit matches “${name}”` };
    // Dedupe without relying on a unique constraint.
    const { data: existing } = await ctx.supabase
      .from("habit_checkins")
      .select("id")
      .eq("user_id", ctx.userId)
      .eq("habit_id", habit.id)
      .eq("checkin_date", today)
      .maybeSingle();
    if (existing) return { ok: true, appId: "habits", message: `Already checked in: ${habit.name}`, href: "/app/habits" };
    const { data, error } = await ctx.supabase
      .from("habit_checkins")
      .insert({ user_id: ctx.userId, habit_id: habit.id, checkin_date: today })
      .select("id")
      .single();
    if (error || !data) return { ok: false, appId: "habits", message: "Couldn't check in" };
    return {
      ok: true,
      appId: "habits",
      message: `Checked in: ${habit.name}`,
      href: "/app/habits",
      undo: { table: "habit_checkins", id: data.id as number },
    };
  },
  match(input) {
    return /^(habit|check|h)\b/i.test(input.trim()) ? 1 : 0;
  },
};
