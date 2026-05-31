import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { Shell } from "@/components/modern/Shell";
import { TrackUsage } from "@/components/modern/TrackUsage";
import { HabitsView } from "./HabitsView";
import { computeStreak, todayISO, weekCount } from "./lib";

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
  /** Trailing ~8 weeks of checked ISO days, for the heatmap. */
  checkinDates: string[];
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

  const enriched: HabitWithStats[] = [];

  for (const habit of (habits || []) as HabitRow[]) {
    const { data: checkins } = await supabase
      .from("habit_checkins")
      .select("checkin_date")
      .eq("habit_id", habit.id)
      .eq("user_id", user.id)
      .order("checkin_date", { ascending: false })
      .limit(120);

    const dateList = (checkins || []).map((c) => c.checkin_date as string);
    const dates = new Set<string>(dateList);

    enriched.push({
      id: habit.id,
      name: habit.name,
      frequency: habit.frequency,
      created_at: habit.created_at,
      streak: computeStreak(dates),
      checkedToday: dates.has(today),
      weekCount: weekCount(dates),
      checkinDates: dateList,
    });
  }

  return (
    <Shell back={{ href: "/apps", label: "Apps" }} title="Habits">
      <TrackUsage appId="habits" />
      <HabitsView habits={enriched} />
    </Shell>
  );
}
