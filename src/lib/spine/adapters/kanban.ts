import "server-only";
import { kanbanToday } from "../lib";
import type { SpineAdapter } from "../types";

// Read-only adapter: work in flight on the kanban board (doing + to-do).
export const adapter: SpineAdapter = {
  appId: "kanban",
  async today(ctx) {
    const { data } = await ctx.supabase
      .from("kanban_cards")
      .select("id, title, column_name")
      .eq("user_id", ctx.userId);
    const rows = (data ?? []) as { id: number; title: string; column_name: string | null }[];
    return kanbanToday(rows);
  },
};
