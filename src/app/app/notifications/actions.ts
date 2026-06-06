"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabase } from "@/lib/supabase/server";
import { buildSpineCtx } from "@/lib/spine/ctx";
import { getToday, REGISTERED_APP_IDS } from "@/lib/spine/registry";
import { chooseApps } from "@/lib/spine/today-view";
import { ensureXp } from "@/lib/xp/compute";
import { buildDigest } from "@/lib/notify/digest";
import { unsubscribeUrl } from "@/lib/notify/tokens";
import type { Kind } from "@/lib/notify/types";

export async function saveNotificationPrefs(prefs: {
  email_enabled: boolean;
  morning_enabled: boolean;
  evening_enabled: boolean;
  morning_time: string;
  evening_time: string;
  streak_save_enabled: boolean;
  ai_insights_enabled: boolean;
}) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  await supabase
    .from("notification_prefs")
    .upsert({ user_id: user.id, ...prefs }, { onConflict: "user_id" });

  revalidatePath("/app/notifications");
}

/**
 * Render exactly what the next digest of `kind` would contain for the current user —
 * the real engine path (getToday + ensureXp + buildDigest), run under the user's session
 * (RLS-safe). No email, no cron, no secrets: a live in-app preview. Skips the earned-only
 * shouldSend() gate on purpose, so you can see the "nothing actionable" state too.
 */
export async function previewDigest(kind: Kind): Promise<{ subject: string; html: string }> {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: prof } = await supabase
    .from("profiles")
    .select("timezone")
    .eq("id", user.id)
    .maybeSingle();
  const tz = (prof?.timezone as string) ?? "UTC";
  const now = new Date();

  const { data: usage } = await supabase
    .from("app_usage")
    .select("app_id, pinned")
    .eq("user_id", user.id)
    .order("pinned", { ascending: false })
    .order("last_used_at", { ascending: false })
    .limit(12);
  const chosen = chooseApps(
    (usage ?? []) as { app_id: string; pinned: boolean }[],
    REGISTERED_APP_IDS,
    8,
  );

  const ctx = buildSpineCtx(supabase, user.id, tz, now);
  const [today, xp] = await Promise.all([
    getToday(ctx, chosen).catch(() => []),
    ensureXp(supabase, user.id, now, tz).catch(() => null),
  ]);

  const digest = buildDigest(kind, today, xp, unsubscribeUrl(user.id, kind), tz);
  return { subject: digest.subject, html: digest.html };
}
