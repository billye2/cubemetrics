import "server-only";
import { todayKey } from "@/lib/xp/tz";
import type { SpineAdapter } from "../types";

export const adapter: SpineAdapter = {
  appId: "journal",
  async today(ctx) {
    const today = todayKey(ctx.tz, ctx.now);
    const { data } = await ctx.supabase
      .from("journal_entries")
      .select("id")
      .eq("user_id", ctx.userId)
      .eq("entry_date", today)
      .limit(1);
    const journaled = (data ?? []).length > 0;
    return journaled
      ? {
          appId: "journal",
          severity: "done",
          count: 0,
          summary: "Journaled",
          items: [{ id: "journal:today", label: "Today's entry", status: "done", href: "/app/journal" }],
          href: "/app/journal",
        }
      : {
          appId: "journal",
          severity: "due",
          count: 1,
          summary: "Write today's entry",
          items: [{ id: "journal:today", label: "Write today's entry", status: "due", href: "/app/journal" }],
          href: "/app/journal",
        };
  },
};
