import "server-only";
import type { createServerSupabase } from "@/lib/supabase/server";
import { scoreDay, emptyActivity, type DayActivity, SOURCE_LABELS, GLOBAL_DAILY_CAP } from "./rules";
import { levelInfo, type LevelInfo } from "./levels";
import { currentStreak, longestStreak } from "./stats";
import { ACHIEVEMENTS, satisfiedAchievements, type CumulativeStats } from "./achievements";
import {
  metricsFromActivity,
  pickDailyQuests,
  questStatuses,
  questPointsForDay,
} from "./quests";
import { localDayKey, localHour, todayKey as tzTodayKey, addDays, weekdayNarrow } from "./tz";

type Supabase = Awaited<ReturnType<typeof createServerSupabase>>;

const ROW_LIMIT = 5000;

// A row's calendar day. DATE columns are already a local calendar date; TIMESTAMPTZ
// columns are a UTC instant that must be projected into the user's zone.
function bucketDay(v: string | null | undefined, kind: "date" | "ts", tz: string): string | null {
  if (!v) return null;
  return kind === "date" ? String(v).slice(0, 10) : localDayKey(v, tz);
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

export interface XpQuestView {
  key: string;
  label: string;
  description: string;
  icon: string;
  current: number;
  target: number;
  done: boolean;
  reward: number;
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
  todayQuests: XpQuestView[];
  questsCompletedToday: number;
}

/**
 * Derive XP for a user from their existing per-app rows, cache the per-day
 * rollup in xp_daily, unlock any newly-earned achievements, and return a
 * summary for the home strip + dashboard. Idempotent.
 */
export async function ensureXp(
  supabase: Supabase,
  userId: string,
  now: Date = new Date(),
  tzOverride?: string,
): Promise<XpSummary> {
  // Resolve the user's zone so day boundaries match their local day.
  let tz = tzOverride || "UTC";
  if (!tzOverride) {
    const { data: prof } = await supabase.from("profiles").select("timezone").eq("id", userId).single();
    if (prof?.timezone) tz = prof.timezone as string;
  }

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
    // entry_date is a local DATE; fall back to projecting created_at into the zone.
    const day = (r.entry_date as string)?.slice(0, 10) ?? bucketDay(r.created_at as string, "ts", tz);
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

  const bump = (
    rows: { data: Record<string, unknown>[] | null },
    col: string,
    field: keyof DayActivity,
    kind: "date" | "ts",
  ) => {
    for (const r of rows.data || []) {
      const day = bucketDay(r[col] as string, kind, tz);
      if (!day) continue;
      (get(day)[field] as number)++;
    }
  };

  const todosCompleted = (todos.data || []).length;
  bump(pomodoro, "completed_at", "pomodoro", "ts");
  bump(todos, "completed_at", "todos", "ts");
  bump(habits, "checkin_date", "habits", "date");
  bump(journal, "entry_date", "journal", "date");
  bump(workout, "performed_on", "workout", "date");
  bump(reading, "finished_at", "reading", "ts");
  bump(notes, "created_at", "notes", "ts");
  bump(logs, "created_at", "logs", "ts");
  bump(expenses, "expense_date", "expenses", "date");
  bump(finance, "created_at", "finance", "ts");

  // Earliest / latest local hour-of-day across timestamped actions (DATE-only
  // sources have no time, so they can't pin a clock hour). Powers the
  // early_bird / night_owl achievements.
  let firstActionHour: number | null = null;
  let lastActionHour: number | null = null;
  const noteHour = (iso: string | null | undefined) => {
    const h = iso ? localHour(iso, tz) : null;
    if (h == null) return;
    if (firstActionHour == null || h < firstActionHour) firstActionHour = h;
    if (lastActionHour == null || h > lastActionHour) lastActionHour = h;
  };
  for (const r of trackers.data || []) noteHour(r.created_at as string);
  for (const r of pomodoro.data || []) noteHour(r.completed_at as string);
  for (const r of todos.data || []) noteHour(r.completed_at as string);
  for (const r of reading.data || []) noteHour(r.finished_at as string);
  for (const r of notes.data || []) noteHour(r.created_at as string);
  for (const r of logs.data || []) noteHour(r.created_at as string);
  for (const r of finance.data || []) noteHour(r.created_at as string);

  // Score every active day.
  const todayKey = tzTodayKey(tz, now);
  const scores = new Map<string, { points: number; breakdown: Record<string, number> }>();
  for (const [day, activity] of days) scores.set(day, scoreDay(activity));

  // --- Daily quests ---
  // Existing claims, grouped by day.
  const { data: claimRows } = await supabase
    .from("xp_quests")
    .select("day, quest_key")
    .eq("user_id", userId);
  const claimsByDay = new Map<string, Set<string>>();
  for (const c of claimRows || []) {
    const set = claimsByDay.get(c.day as string) ?? new Set<string>();
    set.add(c.quest_key as string);
    claimsByDay.set(c.day as string, set);
  }

  // Auto-claim today's newly-completed quests (today only — quests complete on their own day).
  const todayActivity = days.get(todayKey) ?? emptyActivity();
  const todayScore = scores.get(todayKey) ?? scoreDay(emptyActivity());
  const todayMetrics = metricsFromActivity(todayActivity, todayScore);
  const todayQuestDefs = pickDailyQuests(userId, todayKey);
  const claimedToday = claimsByDay.get(todayKey) ?? new Set<string>();
  const statuses = questStatuses(todayQuestDefs, todayMetrics);
  const newlyDone = statuses.filter((s) => s.done && !claimedToday.has(s.def.key));
  if (newlyDone.length > 0) {
    await supabase
      .from("xp_quests")
      .upsert(
        newlyDone.map((s) => ({ user_id: userId, day: todayKey, quest_key: s.def.key, completed_at: now.toISOString() })),
        { onConflict: "user_id,day,quest_key", ignoreDuplicates: true },
      );
    for (const s of newlyDone) claimedToday.add(s.def.key);
    claimsByDay.set(todayKey, claimedToday);
  }

  // Fold quest XP into each day's breakdown (deterministic chosen set per day → consistent history).
  for (const [day, s] of scores) {
    const claimed = claimsByDay.get(day);
    if (!claimed || claimed.size === 0) continue;
    const qp = questPointsForDay(pickDailyQuests(userId, day), claimed);
    if (qp > 0) {
      s.breakdown.quests = qp;
      s.points = Math.min(s.points + qp, GLOBAL_DAILY_CAP);
    }
  }

  const todayQuests: XpQuestView[] = statuses.map((s) => ({
    key: s.def.key,
    label: s.def.label,
    description: s.def.description,
    icon: s.def.icon,
    current: s.current,
    target: s.target,
    done: s.done || claimedToday.has(s.def.key),
    reward: s.def.reward,
  }));
  const questsCompletedToday = todayQuests.filter((q) => q.done).length;

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
      for (const k of Object.keys(s.breakdown)) if (k !== "breadth" && k !== "quests") sourcesEver.add(k);
    }
  }

  const level = levelInfo(totalXp);
  const streak = currentStreak(daysWithXp, todayKey);
  const longest = longestStreak(daysWithXp);

  const stats: CumulativeStats = {
    totalXp,
    level: level.level,
    currentStreak: streak,
    longestStreak: longest,
    appsWithXp: sourcesEver.size,
    focusMinutes,
    todosCompleted,
    activeDays: daysWithXp.size,
    firstActionHour,
    lastActionHour,
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
    const key = addDays(todayKey, -i);
    const s = scores.get(key);
    dailySeries.push({
      day: key,
      short: weekdayNarrow(key),
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
    todayQuests,
    questsCompletedToday,
  };
}
