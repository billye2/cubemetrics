import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { Shell } from "@/components/modern/Shell";
import { WeeklyReviewView } from "./WeeklyReviewView";
import {
  toISODate,
  weekStart,
  weekRange,
  parseISODate,
  addWeeks,
  type WeeklyReview,
} from "./lib";

export const dynamic = "force-dynamic";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export interface WeekStats {
  habitsCompleted: number;
  focusMinutes: number;
  todosDone: number;
  trackedMinutes: number;
}

export default async function WeeklyReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const today = new Date();
  const { week: weekParam } = await searchParams;

  // The week the user is reviewing — defaults to the current week's Monday.
  // Always snap an arbitrary param onto its Monday so the key is canonical.
  const monday =
    weekParam && ISO_DATE.test(weekParam)
      ? weekStart(parseISODate(weekParam))
      : weekStart(today);
  const weekStartISO = toISODate(monday);
  const prevWeekISO = toISODate(addWeeks(monday, -1));
  const nextWeekISO = toISODate(addWeeks(monday, 1));
  const thisWeekISO = toISODate(weekStart(today));
  // Don't let the user page into future weeks they can't have lived yet.
  const canGoNext = monday.getTime() < weekStart(today).getTime();

  // This week's review (if any) + last week's, for the carry-forward hint.
  const { data: reviewRows } = await supabase
    .from("weekly_reviews")
    .select("id, week_start, wins, misses, lessons, next_focus, created_at")
    .eq("user_id", user.id)
    .in("week_start", [weekStartISO, prevWeekISO])
    .limit(2);

  const rows = (reviewRows || []) as WeeklyReview[];
  const review = rows.find((r) => r.week_start === weekStartISO) ?? null;
  const prevReview = rows.find((r) => r.week_start === prevWeekISO) ?? null;

  // P2 — cross-app stats for the covered week (read-only). The week spans
  // [Monday 00:00, next Monday 00:00).
  const { from, to } = weekRange(weekStartISO);

  const [habitsRes, focusRes, todosRes, trackedRes] = await Promise.all([
    supabase
      .from("habit_checkins")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("checkin_date", from)
      .lt("checkin_date", to),
    supabase
      .from("daily_trackers")
      .select("value")
      .eq("user_id", user.id)
      .eq("tracker_type", "focus")
      .gte("created_at", `${from}T00:00:00`)
      .lt("created_at", `${to}T00:00:00`),
    supabase
      .from("todos")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("completed", true)
      .gte("completed_at", `${from}T00:00:00`)
      .lt("completed_at", `${to}T00:00:00`),
    supabase
      .from("daily_trackers")
      .select("value")
      .eq("user_id", user.id)
      .eq("tracker_type", "timetracker")
      .gte("created_at", `${from}T00:00:00`)
      .lt("created_at", `${to}T00:00:00`),
  ]);

  const sumValue = (data: { value: number | null }[] | null) =>
    (data || []).reduce((acc, r) => acc + (Number(r.value) || 0), 0);

  const stats: WeekStats = {
    habitsCompleted: habitsRes.count ?? 0,
    focusMinutes: sumValue(focusRes.data as { value: number | null }[] | null),
    todosDone: todosRes.count ?? 0,
    trackedMinutes: sumValue(trackedRes.data as { value: number | null }[] | null),
  };

  return (
    <Shell back={{ href: "/apps", label: "Apps" }} title="Weekly Review">
      <WeeklyReviewView
        weekStartISO={weekStartISO}
        prevWeekISO={prevWeekISO}
        nextWeekISO={canGoNext ? nextWeekISO : null}
        isCurrentWeek={weekStartISO === thisWeekISO}
        review={review}
        prevReview={prevReview}
        stats={stats}
      />
    </Shell>
  );
}
