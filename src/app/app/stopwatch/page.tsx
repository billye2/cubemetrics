import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { Shell } from "@/components/modern/Shell";
import { StopwatchView } from "./StopwatchView";
import type { TrackerEntry } from "../_factories/trackerLib";

export const dynamic = "force-dynamic";

export default async function StopwatchPage() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const sixtyDaysAgo = new Date();
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
  const { data } = await supabase
    .from("daily_trackers")
    .select("id, value, note, created_at")
    .eq("user_id", user.id)
    .eq("tracker_type", "stopwatch")
    .gte("created_at", sixtyDaysAgo.toISOString())
    .order("created_at", { ascending: false })
    .limit(500);

  return (
    <Shell back={{ href: "/apps", label: "Apps" }} title="Stopwatch">
      <StopwatchView entries={(data || []) as TrackerEntry[]} />
    </Shell>
  );
}
