import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { Shell } from "@/components/modern/Shell";
import { CounterView } from "./CounterView";

export const dynamic = "force-dynamic";

interface CounterRow {
  id: number;
  name: string;
  value: number;
  step: number;
  created_at: string;
}

interface EventRow {
  counter_id: number;
  delta: number;
  created_at: string;
}

export interface CounterWithStats {
  id: number;
  name: string;
  value: number;
  step: number;
  todayNet: number;
  todayTaps: number;
}

export interface DayBucket {
  label: string;
  count: number;
}

// Local-day key (Y-M-D) in the server's zone — consistent with the rest of the
// suite's day bucketing. (Project-wide UTC-on-Vercel caveat noted in the XP tz spec.)
function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

export default async function CounterPage() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: counters } = await supabase
    .from("counters")
    .select("id, name, value, step, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  // 7-day window for today-net + the activity chart.
  const windowStart = new Date();
  windowStart.setDate(windowStart.getDate() - 6);
  windowStart.setHours(0, 0, 0, 0);

  const { data: events } = await supabase
    .from("counter_events")
    .select("counter_id, delta, created_at")
    .eq("user_id", user.id)
    .gte("created_at", windowStart.toISOString());

  const today = dayKey(new Date());
  const evs = (events || []) as EventRow[];

  const todayNetById = new Map<number, number>();
  const todayTapsById = new Map<number, number>();
  const tapsByDay = new Map<string, number>();

  for (const e of evs) {
    const key = dayKey(new Date(e.created_at));
    tapsByDay.set(key, (tapsByDay.get(key) || 0) + 1);
    if (key === today) {
      todayNetById.set(e.counter_id, (todayNetById.get(e.counter_id) || 0) + e.delta);
      todayTapsById.set(e.counter_id, (todayTapsById.get(e.counter_id) || 0) + 1);
    }
  }

  const enriched: CounterWithStats[] = ((counters || []) as CounterRow[]).map((c) => ({
    id: c.id,
    name: c.name,
    value: Number(c.value),
    step: c.step,
    todayNet: todayNetById.get(c.id) || 0,
    todayTaps: todayTapsById.get(c.id) || 0,
  }));

  // Last 7 local days, oldest → newest.
  const chart: DayBucket[] = [];
  const cursor = new Date();
  cursor.setDate(cursor.getDate() - 6);
  for (let i = 0; i < 7; i++) {
    const label = cursor.toLocaleDateString(undefined, { weekday: "short" }).slice(0, 1);
    chart.push({ label, count: tapsByDay.get(dayKey(cursor)) || 0 });
    cursor.setDate(cursor.getDate() + 1);
  }

  const tapsToday = todayTapsById.size
    ? Array.from(todayTapsById.values()).reduce((a, b) => a + b, 0)
    : 0;
  const weekTaps = chart.reduce((a, b) => a + b.count, 0);

  let busiest: string | null = null;
  let busiestTaps = 0;
  for (const c of enriched) {
    if (c.todayTaps > busiestTaps) {
      busiestTaps = c.todayTaps;
      busiest = c.name;
    }
  }

  return (
    <Shell back={{ href: "/", label: "Apps" }} title="Counter">
      <CounterView
        counters={enriched}
        chart={chart}
        tapsToday={tapsToday}
        weekTaps={weekTaps}
        busiest={busiest}
      />
    </Shell>
  );
}
