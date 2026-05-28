import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { Shell } from "@/components/modern/Shell";
import { HabitsView } from "./HabitsView";

export const dynamic = "force-dynamic";

interface HabitRow {
  id: number;
  name: string;
  frequency: string;
  active: boolean;
  created_at: string;
}

export interface HabitWithStats {
  id: number;
  name: string;
  frequency: string;
  created_at: string;
  streak: number;
  checkedToday: boolean;
  weekCount: number;
}

function todayISO(): string {
  return new Date().toISOString().split("T")[0];
}

function isoDaysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split("T")[0];
}

export default async function HabitsPage() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: habits } = await supabase
    .from("habits")
    .select("id, name, frequency, active, created_at")
    .eq("user_id", user.id)
    .eq("active", true)
    .order("created_at", { ascending: true });

  const today = todayISO();
  // Look back 7 days for "this week"
  const weekAgo = isoDaysAgo(6); // include today => 7 days total

  const enriched: HabitWithStats[] = [];

  for (const habit of (habits || []) as HabitRow[]) {
    const { data: checkins } = await supabase
      .from("habit_checkins")
      .select("checkin_date")
      .eq("habit_id", habit.id)
      .eq("user_id", user.id)
      .order("checkin_date", { ascending: false })
      .limit(60);

    const dates = new Set<string>((checkins || []).map((c) => c.checkin_date as string));
    const checkedToday = dates.has(today);

    // Compute consecutive-day streak ending today (or yesterday if not yet
    // checked today, so the streak isn't reset by the user's pending check-in).
    let streak = 0;
    const d = new Date();
    if (!checkedToday) d.setDate(d.getDate() - 1);
    while (dates.has(d.toISOString().split("T")[0])) {
      streak++;
      d.setDate(d.getDate() - 1);
    }

    let weekCount = 0;
    for (const dateStr of dates) {
      if (dateStr >= weekAgo && dateStr <= today) weekCount++;
    }

    enriched.push({
      id: habit.id,
      name: habit.name,
      frequency: habit.frequency,
      created_at: habit.created_at,
      streak,
      checkedToday,
      weekCount,
    });
  }

  return (
    <Shell back={{ href: "/", label: "Apps" }} title="Habits">
      <HabitsView habits={enriched} />
    </Shell>
  );
}
