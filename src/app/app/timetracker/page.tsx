import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { Shell } from "@/components/modern/Shell";
import { TimeTrackerView } from "./TimeTrackerView";

export const dynamic = "force-dynamic";

export default async function TimeTrackerPage() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const sixtyDaysAgo = new Date();
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

  const { data } = await supabase
    .from("daily_trackers")
    .select("id, value, label, note, created_at")
    .eq("user_id", user.id)
    .eq("tracker_type", "timetracker")
    .gte("created_at", sixtyDaysAgo.toISOString())
    .order("created_at", { ascending: false })
    .limit(300);

  return (
    <Shell back={{ href: "/", label: "Apps" }} title="Time Tracker">
      <TimeTrackerView entries={data || []} />
    </Shell>
  );
}
