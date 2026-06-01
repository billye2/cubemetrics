import "server-only";
import { todayKey } from "@/lib/xp/tz";
import { todoToday } from "../lib";
import type { SpineAdapter } from "../types";

export const adapter: SpineAdapter = {
  appId: "todo",
  async today(ctx) {
    const today = todayKey(ctx.tz, ctx.now);
    const { data } = await ctx.supabase
      .from("todos")
      .select("id, title, due_date")
      .eq("user_id", ctx.userId)
      .eq("completed", false);
    const rows = (data ?? []) as { id: number; title: string; due_date: string | null }[];
    if (rows.length === 0) return null;
    return todoToday(rows, today);
  },
};
