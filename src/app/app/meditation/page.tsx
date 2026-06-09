import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { Shell } from "@/components/modern/Shell";
import { TrackUsage } from "@/components/modern/TrackUsage";
import { MeditationView } from "./MeditationView";
import { parseEntry, DEFAULT_GOAL } from "./lib";

export const dynamic = "force-dynamic";

export default async function MeditationPage() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: rows } = await supabase
    .from("daily_trackers")
    .select("id, value, note, created_at")
    .eq("user_id", user.id)
    .eq("tracker_type", "meditation")
    .order("created_at", { ascending: false })
    .limit(300);

  const { data: goalRows } = await supabase
    .from("daily_trackers")
    .select("value")
    .eq("user_id", user.id)
    .eq("tracker_type", "meditation_goal")
    .limit(1);

  const entries = (rows ?? []).map(parseEntry);
  const goal =
    goalRows && goalRows.length
      ? Math.max(5, Math.round(Number(goalRows[0].value) || DEFAULT_GOAL))
      : DEFAULT_GOAL;

  return (
    <Shell back={{ href: "/apps", label: "Apps" }} title="Meditation">
      <TrackUsage appId="meditation" />
      <MeditationView entries={entries} goal={goal} />
    </Shell>
  );
}
