import "server-only";
import { todayKey } from "@/lib/xp/tz";
import { getApp } from "@/lib/modern/catalog";
import { sumToday, stripPrefix, parseLeadingNumber } from "../lib";
import type { SpineAdapter } from "../types";

const goal = () => getApp("water")?.config?.dailyGoal ?? 8;

export const adapter: SpineAdapter = {
  appId: "water",
  async today(ctx) {
    const today = todayKey(ctx.tz, ctx.now);
    const { data } = await ctx.supabase
      .from("daily_trackers")
      .select("value")
      .eq("user_id", ctx.userId)
      .eq("tracker_type", "water")
      .eq("entry_date", today);
    // Always show the card (the "0/8" zero-state IS the nudge).
    return sumToday((data ?? []) as { value: number | null }[], goal());
  },
  async quickLog(ctx, input) {
    const n = parseLeadingNumber(stripPrefix(input, ["water", "w"]), 1);
    const { data, error } = await ctx.supabase
      .from("daily_trackers")
      .insert({ user_id: ctx.userId, tracker_type: "water", value: n, entry_date: todayKey(ctx.tz, ctx.now) })
      .select("id")
      .single();
    if (error || !data) return { ok: false, appId: "water", message: "Couldn't log water" };
    return {
      ok: true,
      appId: "water",
      message: `Logged ${n} glass${n === 1 ? "" : "es"}`,
      href: "/app/water",
      undo: { table: "daily_trackers", id: data.id as number },
    };
  },
  match(input) {
    return /^(water|w)\b/i.test(input.trim()) ? 1 : 0;
  },
};
