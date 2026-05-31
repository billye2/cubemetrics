import "server-only";
import { todayKey } from "@/lib/xp/tz";
import { todoToday, stripPrefix } from "../lib";
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
  async quickLog(ctx, input) {
    const title = stripPrefix(input, ["todo", "t"]).trim();
    if (!title) return { ok: false, appId: "todo", message: "Nothing to add" };
    const { data, error } = await ctx.supabase
      .from("todos")
      .insert({ user_id: ctx.userId, title })
      .select("id")
      .single();
    if (error || !data) return { ok: false, appId: "todo", message: "Couldn't add todo" };
    return {
      ok: true,
      appId: "todo",
      message: "Added todo",
      href: "/app/todo",
      undo: { table: "todos", id: data.id as number },
    };
  },
  match(input) {
    return /^(todo|t)\b/i.test(input.trim()) ? 1 : 0.2; // bare text is the catch-all
  },
};
