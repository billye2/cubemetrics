import "server-only";
import { todayKey } from "@/lib/xp/tz";
import { stripPrefix } from "../lib";
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
  async quickLog(ctx, input) {
    const body = stripPrefix(input, ["journal", "j"]).trim();
    if (!body) return { ok: false, appId: "journal", message: "Nothing to write" };
    const { data, error } = await ctx.supabase
      .from("journal_entries")
      .insert({ user_id: ctx.userId, body, entry_date: todayKey(ctx.tz, ctx.now) })
      .select("id")
      .single();
    if (error || !data) return { ok: false, appId: "journal", message: "Couldn't save entry" };
    return {
      ok: true,
      appId: "journal",
      message: "Saved journal entry",
      href: "/app/journal",
      undo: { table: "journal_entries", id: data.id as number },
    };
  },
  match(input) {
    return /^(journal|j)\b/i.test(input.trim()) ? 1 : 0;
  },
};
