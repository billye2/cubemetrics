import "server-only";
import { todayKey } from "@/lib/xp/tz";
import { checklistDueToday } from "../lib";
import type { SpineAdapter } from "../types";

// Read-only adapter: unpacked items (checklists list_type "packing"). Situational — null
// when the list is empty/all packed, so it only shows on Today while you're actually packing.
export const adapter: SpineAdapter = {
  appId: "packing",
  async today(ctx) {
    const today = todayKey(ctx.tz, ctx.now);
    const { data } = await ctx.supabase
      .from("checklists")
      .select("id, title, due_date")
      .eq("user_id", ctx.userId)
      .eq("list_type", "packing")
      .eq("completed", false);
    const rows = (data ?? []) as { id: number; title: string; due_date: string | null }[];
    return checklistDueToday("packing", rows, today);
  },
};
