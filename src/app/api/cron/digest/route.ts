import crypto from "node:crypto";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { ensureXp } from "@/lib/xp/compute";
import { todayKey } from "@/lib/xp/tz";
import { buildSpineCtx } from "@/lib/spine/ctx";
import { getToday, REGISTERED_APP_IDS } from "@/lib/spine/registry";
import { chooseApps } from "@/lib/spine/today-view";
import { isDue } from "@/lib/notify/select";
import { shouldSend } from "@/lib/notify/policy";
import { buildDigest } from "@/lib/notify/digest";
import { sendEmail } from "@/lib/notify/email";
import { unsubscribeUrl } from "@/lib/notify/tokens";
import type { Kind, NotifyPrefs } from "@/lib/notify/types";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** Constant-time bearer check (avoids a timing oracle on CRON_SECRET). */
function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const got = req.headers.get("authorization") ?? "";
  const want = `Bearer ${secret}`;
  const a = Buffer.from(got);
  const b = Buffer.from(want);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/** Local hour + minute in the user's zone (DST-safe via Intl). */
function localHM(now: Date, tz: string): { h: number; m: number } {
  try {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: tz,
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(now);
    return {
      h: Number(parts.find((p) => p.type === "hour")?.value ?? "0"),
      m: Number(parts.find((p) => p.type === "minute")?.value ?? "0"),
    };
  } catch {
    return { h: now.getUTCHours(), m: now.getUTCMinutes() };
  }
}

type Admin = ReturnType<typeof createAdminSupabase>;

async function sentKindsToday(admin: Admin, userId: string, localDay: string): Promise<Set<Kind>> {
  const { data } = await admin
    .from("notification_log")
    .select("kind")
    .eq("user_id", userId)
    .eq("local_day", localDay);
  return new Set((data ?? []).map((r) => r.kind as Kind));
}

export async function GET(req: Request) {
  if (!authorized(req)) return new Response("Unauthorized", { status: 401 });

  const now = new Date();
  const admin = createAdminSupabase();
  const { data: prefsRows } = await admin.from("notification_prefs").select("*").eq("email_enabled", true);

  let sent = 0;
  let skipped = 0;

  for (const prefs of (prefsRows ?? []) as NotifyPrefs[]) {
    const { data: prof } = await admin.from("profiles").select("timezone").eq("id", prefs.user_id).single();
    const tz = (prof?.timezone as string) ?? "UTC";
    const localDay = todayKey(tz, now);
    const { h, m } = localHM(now, tz);

    const already = await sentKindsToday(admin, prefs.user_id, localDay);
    const kinds = isDue(prefs, h, m, already);
    if (kinds.length === 0) continue;

    for (const kind of kinds) {
      // Claim the slot atomically — prevents double-send across overlapping ticks.
      const { data: claim } = await admin
        .from("notification_log")
        .insert({ user_id: prefs.user_id, kind, local_day: localDay })
        .select("id")
        .maybeSingle();
      if (!claim) continue; // unique conflict ⇒ already handled

      const ctx = buildSpineCtx(admin, prefs.user_id, tz, now);
      const { data: usage } = await admin
        .from("app_usage")
        .select("app_id, pinned")
        .eq("user_id", prefs.user_id)
        .order("pinned", { ascending: false })
        .order("last_used_at", { ascending: false })
        .limit(12);
      const chosen = chooseApps((usage ?? []) as { app_id: string; pinned: boolean }[], REGISTERED_APP_IDS, 8);

      const [today, xp] = await Promise.all([
        getToday(ctx, chosen).catch(() => []),
        ensureXp(admin, prefs.user_id, now, tz).catch(() => null),
      ]);

      // Trust gate — release the claim and skip when nothing is earned.
      if (!shouldSend(kind, today, xp)) {
        await admin.from("notification_log").delete().eq("id", claim.id);
        skipped++;
        continue;
      }

      const { data: u } = await admin.auth.admin.getUserById(prefs.user_id);
      const email = u?.user?.email ?? "";
      const mail = buildDigest(kind, today, xp, unsubscribeUrl(prefs.user_id, kind), tz);
      const ok = await sendEmail(email, mail);
      if (ok) sent++;
      else {
        // Couldn't actually send (e.g. provider not configured) — release the claim
        // so a later tick retries once provisioned.
        await admin.from("notification_log").delete().eq("id", claim.id);
        skipped++;
      }
    }
  }

  return Response.json({ ok: true, sent, skipped });
}
