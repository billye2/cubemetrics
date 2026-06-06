import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { Shell } from "@/components/modern/Shell";
import { SignOutButton } from "@/components/modern/SignOutButton";
import { TimezoneSync } from "@/components/modern/TimezoneSync";
import { ensureXp } from "@/lib/xp/compute";
import { localHour } from "@/lib/xp/tz";
import { buildSpineCtx } from "@/lib/spine/ctx";
import { getToday, REGISTERED_APP_IDS } from "@/lib/spine/registry";
import { pickMode, resolveTodayApps, groupBySeverity, type Mode } from "@/lib/spine/today-view";
import { TodayHeader } from "@/components/modern/today/TodayHeader";
import { TodayBody } from "@/components/modern/today/TodayBody";

export const dynamic = "force-dynamic";

const MODES: Mode[] = ["morning", "day", "evening"];

export default async function TodayPage({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: prof } = await supabase
    .from("profiles")
    .select("handle, timezone")
    .eq("id", user.id)
    .single();
  const tz = prof?.timezone ?? "UTC";
  const now = new Date();
  const ctx = buildSpineCtx(supabase, user.id, tz, now);

  // Which apps to show: an agent/user layout override (today_prefs) wins; else pinned →
  // recent, filtered to those with an adapter. Both reads best-effort (force-dynamic page).
  const [{ data: usage }, { data: prefs }] = await Promise.all([
    supabase
      .from("app_usage")
      .select("app_id, pinned")
      .eq("user_id", user.id)
      .order("pinned", { ascending: false })
      .order("last_used_at", { ascending: false })
      .limit(12),
    supabase
      .from("today_prefs")
      .select("focus, ordered_app_ids, hidden_app_ids")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);
  const chosen = resolveTodayApps(
    prefs ?? null,
    (usage ?? []) as { app_id: string; pinned: boolean }[],
    REGISTERED_APP_IDS,
    8,
  );

  // Fan out — both best-effort so one slow/broken source never blanks the page.
  const [today, xp] = await Promise.all([
    getToday(ctx, chosen).catch(() => []),
    ensureXp(supabase, user.id, now, tz).catch(() => null),
  ]);

  const sp = await searchParams;
  const mode: Mode = sp?.m && MODES.includes(sp.m as Mode) ? (sp.m as Mode) : pickMode(localHour(now, tz) ?? 9);
  const groups = groupBySeverity(today);

  return (
    <Shell right={<SignOutButton />}>
      <TimezoneSync knownTz={prof?.timezone ?? null} />
      <TodayHeader mode={mode} name={prof?.handle ?? "Friend"} xp={xp} focus={prefs?.focus ?? null} />
      <TodayBody mode={mode} groups={groups} />
      <Link href="/apps" className="mt-2 block text-center text-sm text-cyan-400 hover:text-cyan-300">
        Browse all apps →
      </Link>
    </Shell>
  );
}
