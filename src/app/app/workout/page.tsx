import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { Shell } from "@/components/modern/Shell";
import { WorkoutView, type SessionWithSets, type WorkoutSet } from "./WorkoutView";

export const dynamic = "force-dynamic";

export default async function WorkoutPage() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const ninetyAgo = new Date();
  ninetyAgo.setDate(ninetyAgo.getDate() - 90);
  const cutoff = ninetyAgo.toISOString().split("T")[0];

  const { data: sessions } = await supabase
    .from("workout_sessions")
    .select("id, title, performed_on, note, created_at")
    .eq("user_id", user.id)
    .gte("performed_on", cutoff)
    .order("performed_on", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(200);

  const sessionIds = (sessions || []).map((s) => s.id);
  let sets: WorkoutSet[] = [];
  if (sessionIds.length > 0) {
    const { data } = await supabase
      .from("workout_sets")
      .select("id, session_id, exercise, reps, weight, rpe, created_at")
      .eq("user_id", user.id)
      .in("session_id", sessionIds)
      .order("created_at", { ascending: true });
    sets = (data || []) as WorkoutSet[];
  }

  const bySession = new Map<number, WorkoutSet[]>();
  for (const s of sets) {
    const arr = bySession.get(s.session_id) ?? [];
    arr.push(s);
    bySession.set(s.session_id, arr);
  }

  // Personal record per exercise = heaviest weight ever logged (within window).
  const prByExercise = new Map<string, number>();
  for (const s of sets) {
    if (s.weight == null) continue;
    const key = s.exercise.toLowerCase();
    const w = Number(s.weight);
    if (!prByExercise.has(key) || w > prByExercise.get(key)!) prByExercise.set(key, w);
  }

  const enriched: SessionWithSets[] = (sessions || []).map((s) => ({
    ...s,
    sets: bySession.get(s.id) ?? [],
  }));

  // Weekly stats computed server-side (last 7 calendar days, inclusive of today).
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 6);
  const weekCutoff = weekAgo.toISOString().split("T")[0];
  const weekSessionList = enriched.filter((s) => s.performed_on >= weekCutoff);
  const weekVolume = weekSessionList.reduce(
    (acc, s) =>
      acc +
      s.sets.reduce(
        (v, set) => v + (set.reps != null && set.weight != null ? Number(set.reps) * Number(set.weight) : 0),
        0,
      ),
    0,
  );

  return (
    <Shell back={{ href: "/apps", label: "Apps" }} title="Workout">
      <WorkoutView
        sessions={enriched}
        prByExercise={Object.fromEntries(prByExercise)}
        stats={{
          weekSessions: weekSessionList.length,
          weekVolume,
          totalSessions: enriched.length,
        }}
      />
    </Shell>
  );
}
