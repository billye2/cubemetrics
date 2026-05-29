import "server-only";
import type { createServerSupabase } from "@/lib/supabase/server";
import { scoreDay, emptyActivity, type DayActivity, SOURCE_LABELS } from "./rules";
import { levelInfo, type LevelInfo } from "./levels";
import { currentStreak, longestStreak, dayKey } from "./stats";
import { ACHIEVEMENTS, satisfiedAchievements, type CumulativeStats } from "./achievements";

type Supabase = Awaited<ReturnType<typeof createServerSupabase>>;

const ROW_LIMIT = 5000;

function toDay(v: string | null | undefined): string | null {
  if (!v) return null;
  return String(v).slice(0, 10);
}

export interface XpAchievementView {
  key: string;
  name: string;
  description: string;
  icon: string;
  unlocked: boolean;
  unlockedAt: string | null;
  isNew: boolean;
}

export interface XpSummary {
  level: LevelInfo;
  streak: number;
  longestStreak: number;
  todayPoints: number;
  todayBreakdown: Record<string, number>;
  activeDays: number;
  dailySeries: { day: string; short: string; points: number; isToday: boolean }[];
  breakdownTotals: { source: string; label: string; points: number }[];
  achievements: XpAchievementView[];
  newlyUnlocked: string[];
}

/**
 * Derive XP for a user from their existing per-app rows, cache the per-day
 * rollup in xp_daily, unlock any newly-earned achievements, and return a
 * summary for the home strip + dashboard. Idempotent.
 */
export async function ensureXp(supabase: Supabase, userId: string, now: Date = new Date()): Promise<XpSummary> {
  const [
    trackers,
    pomodoro,
    todos,
    habits,
    journal,
    workout,
    reading,
    notes,
    logs,
    expenses,
    finance,
  ] = await Promise.all([
    supabase.from("daily_trackers").select("tracker_type, value, entry_date, created_at").eq("user_id", userId).limit(ROW_LIMIT),
    supabase.from("pomodoro_sessions").select("completed_at").eq("user_id", userId).eq("completed", true).limit(ROW_LIMIT),
    supabase.from("todos").select("completed_at").eq("user_id", userId).eq("completed", true).limit(ROW_LIMIT),
    supabase.from("habit_checkins").select("checkin_date").eq("user_id", userId).limit(ROW_LIMIT),
    supabase.from("journal_entries").select("entry_date").eq("user_id", userId).limit(ROW_LIMIT),
    supabase.from("workout_sessions").select("performed_on").eq("user_id", userId).limit(ROW_LIMIT),
    supabase.from("reading_list").select("finished_at").eq("user_id", userId).not("finished_at", "is", null).limit(ROW_LIMIT),
    supabase.from("notes").select("created_at").eq("user_id", userId).limit(ROW_LIMIT),
    supabase.from("logs").select("created_at").eq("user_id", userId).limit(ROW_LIMIT),
    supabase.from("expenses").select("expense_date").eq("user_id", userId).limit(ROW_LIMIT),
    supabase.from("finance_items").select("created_at").eq("user_id", userId).limit(ROW_LIMIT),
  ]);

  const days = new Map<string, DayActivity>();
  const trackerSets = new Map<string, Set<string>>();
  const get = (day: string) => {
    let a = days.get(day);
    if (!a) {
      a = emptyActivity();
      days.set(day, a);
    }
    return a;
  };

  let focusMinutes = 0;
  for (const r of trackers.data || []) {
    const day = toDay((r.entry_date as string) ?? (r.created_at as string));
    if (!day) continue;
    const a = get(day);
    const type = r.tracker_type as string;
    const value = Number(r.value) || 0;
    if (type === "focus") {
      a.focus.push({ minutes: value });
      focusMinutes += value;
    } else if (type === "timetracker") {
      a.timetracker++;
    } else {
      let set = trackerSets.get(day);
      if (!set) {
        set = new Set();
        trackerSets.set(day, set);
      }
      set.add(type);
    }
  }
  for (const [day, set] of trackerSets) get(day).trackerTypes = [...set];

  const bump = (rows: { data: Record<string, unknown>[] | null }, col: string, field: keyof DayActivity) => {
    for (const r of rows.data || []) {
      const day = toDay(r[col] as string);
      if (!day) continue;
      (get(day)[field] as number)++;
    }
  };

  const todosCompleted = (todos.data || []).length;
  bump(pomodoro, "completed_at", "pomodoro");
  bump(todos, "completed_at", "todos");
  bump(habits, "checkin_date", "habits");
  bump(journal, "entry_date", "journal");
  bump(workout, "performed_on", "workout");
  bump(reading, "finished_at", "reading");
  bump(notes, "created_at", "notes");
  bump(logs, "created_at", "logs");
  bump(expenses, "expense_date", "expenses");
  bump(finance, "created_at", "finance");

  // Score every active day.
  const todayKey = dayKey(now);
  const scores = new Map<string, { points: number; breakdown: Record<string, number> }>();
  for (const [day, activity] of days) scores.set(day, scoreDay(activity));

  // Upsert the rollup. Include today even if zero so same-day removals reflect.
  const rows = [...scores.entries()]
    .filter(([day, s]) => s.points > 0 || day === todayKey)
    .map(([day, s]) => ({ user_id: userId, day, points: s.points, breakdown: s.breakdown, computed_at: now.toISOString() }));
  if (rows.length > 0) {
    await supabase.from("xp_daily").upsert(rows, { onConflict: "user_id,day" });
  }

  // Aggregates.
  const daysWithXp = new Set<string>();
  let totalXp = 0;
  const sourcesEver = new Set<string>();
  for (const [day, s] of scores) {
    if (s.points > 0) {
      daysWithXp.add(day);
      totalXp += s.points;
      for (const k of Object.keys(s.breakdown)) if (k !== "breadth") sourcesEver.add(k);
    }
  }

  const level = levelInfo(totalXp);
  const streak = currentStreak(daysWithXp, now);
  const longest = longestStreak(daysWithXp);
  const todayScore = scores.get(todayKey);

  const stats: CumulativeStats = {
    totalXp,
    level: level.level,
    currentStreak: streak,
    longestStreak: longest,
    appsWithXp: sourcesEver.size,
    focusMinutes,
    todosCompleted,
    activeDays: daysWithXp.size,
  };

  // Unlock newly-earned achievements (unique constraint dedupes concurrent writes).
  const satisfied = satisfiedAchievements(stats);
  const { data: existing } = await supabase
    .from("xp_achievements")
    .select("achievement_key, unlocked_at")
    .eq("user_id", userId);
  const unlockedMap = new Map<string, string>();
  for (const e of existing || []) unlockedMap.set(e.achievement_key as string, e.unlocked_at as string);

  const toInsert = satisfied.filter((k) => !unlockedMap.has(k));
  if (toInsert.length > 0) {
    await supabase
      .from("xp_achievements")
      .upsert(
        toInsert.map((k) => ({ user_id: userId, achievement_key: k, unlocked_at: now.toISOString() })),
        { onConflict: "user_id,achievement_key", ignoreDuplicates: true },
      );
    for (const k of toInsert) unlockedMap.set(k, now.toISOString());
  }

  const newlyUnlocked = toInsert;
  const dayAgo = now.getTime() - 86_400_000;
  const achievements: XpAchievementView[] = ACHIEVEMENTS.map((a) => {
    const at = unlockedMap.get(a.key) ?? null;
    return {
      key: a.key,
      name: a.name,
      description: a.description,
      icon: a.icon,
      unlocked: at != null,
      unlockedAt: at,
      isNew: at != null && new Date(at).getTime() >= dayAgo,
    };
  });

  // 30-day chart series + per-source breakdown over the same window.
  const dailySeries: XpSummary["dailySeries"] = [];
  const windowBreakdown = new Map<string, number>();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const key = dayKey(d);
    const s = scores.get(key);
    dailySeries.push({
      day: key,
      short: d.toLocaleDateString(undefined, { weekday: "narrow" }),
      points: s?.points ?? 0,
      isToday: key === todayKey,
    });
    if (s) for (const [src, v] of Object.entries(s.breakdown)) windowBreakdown.set(src, (windowBreakdown.get(src) ?? 0) + v);
  }
  const breakdownTotals = [...windowBreakdown.entries()]
    .filter(([src]) => src !== "breadth")
    .sort((a, b) => b[1] - a[1])
    .map(([source, points]) => ({ source, label: SOURCE_LABELS[source] ?? source, points }));

  return {
    level,
    streak,
    longestStreak: longest,
    todayPoints: todayScore?.points ?? 0,
    todayBreakdown: todayScore?.breakdown ?? {},
    activeDays: daysWithXp.size,
    dailySeries,
    breakdownTotals,
    achievements,
    newlyUnlocked,
  };
}
