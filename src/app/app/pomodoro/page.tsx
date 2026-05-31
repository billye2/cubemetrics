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
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 6);
  weekStart.setHours(0, 0, 0, 0);

  const [{ data: activeRows }, { count }, { data: recent }, { data: weekRows }] = await Promise.all([
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
    supabase
      .from("pomodoro_sessions")
      .select("completed_at")
      .eq("user_id", user.id)
      .eq("completed", true)
      .gte("completed_at", weekStart.toISOString()),
  ]);

  const active = activeRows && activeRows.length > 0 ? activeRows[0] : null;

  // Bucket completed pomodoros into the last 7 local days for the chart.
  const week: { short: string; label: string; count: number; isToday: boolean }[] = [];
  const counts = new Map<string, number>();
  for (const r of weekRows || []) {
    if (!r.completed_at) continue;
    const key = new Date(r.completed_at as string).toLocaleDateString("en-CA"); // YYYY-MM-DD local
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const todayKey = new Date().toLocaleDateString("en-CA");
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toLocaleDateString("en-CA");
    week.push({
      short: d.toLocaleDateString(undefined, { weekday: "narrow" }),
      label: d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }),
      count: counts.get(key) ?? 0,
      isToday: key === todayKey,
    });
  }

  return (
    <Shell back={{ href: "/apps", label: "Apps" }} title="Pomodoro">
      <PomodoroView active={active} todayCount={count || 0} recent={recent || []} week={week} />
    </Shell>
  );
}
