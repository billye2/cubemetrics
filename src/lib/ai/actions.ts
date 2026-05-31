"use server";
import { getSpineCtx } from "@/lib/spine/ctx";
import { getToday, REGISTERED_APP_IDS } from "@/lib/spine/registry";
import { chooseApps, pickMode } from "@/lib/spine/today-view";
import { ensureXp } from "@/lib/xp/compute";
import { localHour } from "@/lib/xp/tz";
import { getNudge } from "./nudge-input";

/** The Today insight line, fetched progressively by <TodayInsight> after mount so
 *  it never blocks the page. Recomputes the day server-side (never trusts client
 *  input). Honors the per-user ai_insights_enabled opt-out. */
export async function fetchTodayNudge(): Promise<string> {
  const ctx = await getSpineCtx();
  if (!ctx) return "";

  // Per-user opt-out (column lives in notification_prefs).
  const { data: prefs } = await ctx.supabase
    .from("notification_prefs")
    .select("ai_insights_enabled")
    .eq("user_id", ctx.userId)
    .maybeSingle();
  if (prefs && prefs.ai_insights_enabled === false) return "";

  const { data: usage } = await ctx.supabase
    .from("app_usage")
    .select("app_id, pinned")
    .eq("user_id", ctx.userId)
    .order("pinned", { ascending: false })
    .order("last_used_at", { ascending: false })
    .limit(12);
  const chosen = chooseApps((usage ?? []) as { app_id: string; pinned: boolean }[], REGISTERED_APP_IDS, 8);

  const [today, xp] = await Promise.all([
    getToday(ctx, chosen).catch(() => []),
    ensureXp(ctx.supabase, ctx.userId, ctx.now, ctx.tz).catch(() => null),
  ]);

  return getNudge(today, xp, pickMode(localHour(ctx.now, ctx.tz) ?? 9));
}
