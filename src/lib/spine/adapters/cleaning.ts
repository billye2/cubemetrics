import "server-only";
import { todayKey } from "@/lib/xp/tz";
import { checklistDueToday } from "../lib";
import type { SpineAdapter } from "../types";

// Read-only adapter: open cleaning chores (checklists list_type "cleaning"). A due_date
// ranks urgency; undated open items are plain "due". Null when nothing's open.
export const adapter: SpineAdapter = {
  appId: "cleaning",
  async today(ctx) {
    const today = todayKey(ctx.tz, ctx.now);
    const { data } = await ctx.supabase
      .from("checklists")
      .select("id, title, due_date")
      .eq("user_id", ctx.userId)
      .eq("list_type", "cleaning")
      .eq("completed", false);
    const rows = (data ?? []) as { id: number; title: string; due_date: string | null }[];
    return checklistDueToday("cleaning", rows, today);
  },
};
