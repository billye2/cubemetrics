import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { Shell } from "@/components/modern/Shell";
import { PomodoroView } from "./PomodoroView";

export const dynamic = "force-dynamic";

export default async function PomodoroPage() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const today = new Date().toISOString().slice(0, 10);

  const [{ data: activeRows }, { count }, { data: recent }] = await Promise.all([
    supabase
      .from("pomodoro_sessions")
      .select("id, started_at, duration_minutes, label")
      .eq("user_id", user.id)
      .eq("completed", false)
      .order("started_at", { ascending: false })
      .limit(1),
    supabase
      .from("pomodoro_sessions")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("completed", true)
      .gte("completed_at", today + "T00:00:00"),
    supabase
      .from("pomodoro_sessions")
      .select("id, started_at, duration_minutes, label, completed_at")
      .eq("user_id", user.id)
      .eq("completed", true)
      .order("completed_at", { ascending: false })
      .limit(20),
  ]);

  const active = activeRows && activeRows.length > 0 ? activeRows[0] : null;

  return (
    <Shell back={{ href: "/", label: "Apps" }} title="Pomodoro">
      <PomodoroView active={active} todayCount={count || 0} recent={recent || []} />
    </Shell>
  );
}
