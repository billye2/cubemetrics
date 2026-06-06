import "server-only";
import { todayKey, addDays } from "@/lib/xp/tz";
import { calendarToday } from "../lib";
import type { SpineAdapter } from "../types";

// Read-only adapter: calendar events starting within the next 7 days.
export const adapter: SpineAdapter = {
  appId: "calendar",
  async today(ctx) {
    const today = todayKey(ctx.tz, ctx.now);
    const soon = addDays(today, 7);
    const { data } = await ctx.supabase
      .from("calendar_events")
      .select("id, title, start_date, start_time")
      .eq("user_id", ctx.userId)
      .gte("start_date", today)
      .lte("start_date", soon);
    const rows = (data ?? []) as {
      id: number;
      title: string;
      start_date: string;
      start_time: string | null;
    }[];
    return calendarToday(rows, today, soon);
  },
};
