import "server-only";
import { todayKey } from "@/lib/xp/tz";
import { projectsToday } from "../lib";
import type { SpineAdapter } from "../types";

// Read-only adapter: active projects, severity by deadline (overdue ones surface first).
export const adapter: SpineAdapter = {
  appId: "projecttracker",
  async today(ctx) {
    const today = todayKey(ctx.tz, ctx.now);
    const { data } = await ctx.supabase
      .from("projects")
      .select("id, title, status, due_date")
      .eq("user_id", ctx.userId);
    const rows = (data ?? []) as {
      id: number;
      title: string;
      status: string;
      due_date: string | null;
    }[];
    if (rows.length === 0) return null;
    return projectsToday(rows, today);
  },
};
