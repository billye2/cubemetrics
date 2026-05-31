import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { Shell } from "@/components/modern/Shell";
import { TrackUsage } from "@/components/modern/TrackUsage";
import { NotificationsView } from "./NotificationsView";

export const dynamic = "force-dynamic";

const DEFAULTS = {
  email_enabled: false,
  morning_enabled: true,
  evening_enabled: true,
  morning_time: "08:00",
  evening_time: "20:00",
  streak_save_enabled: true,
  ai_insights_enabled: true,
};

/** Coerce a "HH:MM" or "HH:MM:SS" time string to "HH:MM" for <input type="time">. */
function toHHMM(raw: unknown, fallback: string): string {
  const s = String(raw ?? "").slice(0, 5);
  return s.length === 5 ? s : fallback;
}

export default async function NotificationsPage() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: row } = await supabase
    .from("notification_prefs")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  const prefs = {
    email_enabled: row?.email_enabled ?? DEFAULTS.email_enabled,
    morning_enabled: row?.morning_enabled ?? DEFAULTS.morning_enabled,
    evening_enabled: row?.evening_enabled ?? DEFAULTS.evening_enabled,
    morning_time: toHHMM(row?.morning_time, DEFAULTS.morning_time),
    evening_time: toHHMM(row?.evening_time, DEFAULTS.evening_time),
    streak_save_enabled: row?.streak_save_enabled ?? DEFAULTS.streak_save_enabled,
    ai_insights_enabled: row?.ai_insights_enabled ?? DEFAULTS.ai_insights_enabled,
  };

  return (
    <Shell back={{ href: "/apps", label: "Apps" }} title="Notifications">
      <TrackUsage appId="notifications" />
      <NotificationsView prefs={prefs} />
    </Shell>
  );
}
