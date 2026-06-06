import "server-only";
import { todayKey } from "@/lib/xp/tz";
import { checklistDueToday } from "../lib";
import type { SpineAdapter } from "../types";

// Read-only adapter: open home-maintenance tasks (checklists list_type "homemaint").
export const adapter: SpineAdapter = {
  appId: "homemaint",
  async today(ctx) {
    const today = todayKey(ctx.tz, ctx.now);
    const { data } = await ctx.supabase
      .from("checklists")
      .select("id, title, due_date")
      .eq("user_id", ctx.userId)
      .eq("list_type", "homemaint")
      .eq("completed", false);
    const rows = (data ?? []) as { id: number; title: string; due_date: string | null }[];
    return checklistDueToday("homemaint", rows, today);
  },
};
