import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { Shell } from "@/components/modern/Shell";
import { FocusView } from "./FocusView";

export const dynamic = "force-dynamic";

export default async function FocusPage() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const sixtyDaysAgo = new Date();
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

  const { data } = await supabase
    .from("daily_trackers")
    .select("id, value, label, note, created_at")
    .eq("user_id", user.id)
    .eq("tracker_type", "focus")
    .gte("created_at", sixtyDaysAgo.toISOString())
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <Shell back={{ href: "/", label: "Apps" }} title="Focus">
      <FocusView entries={data || []} />
    </Shell>
  );
}
