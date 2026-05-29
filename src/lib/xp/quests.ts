// XP daily quests (Phase 3). Three quests per local day, chosen deterministically
// from a pool, auto-claimed the moment their metric crosses target, awarding bonus
// XP that flows through the xp_daily rollup under a synthetic "quests" source.
// All functions here are pure + unit-tested; the claim flow lives in compute.ts.

import type { DayActivity, DayScore } from "./rules";

export interface QuestMetrics {
  focusSessions: number;
  focusMinutes: number;
  timetrackerEntries: number;
  distinctTrackers: number;
  pomodoros: number;
  todos: number;
  habits: number;
  journalEntries: number;
  workouts: number;
  booksFinished: number;
  notes: number;
  logEntries: number;
  activeSources: number;
}

/** Map a day's activity (+ its score, for breadth) to quest metrics. Pure. */
export function metricsFromActivity(a: DayActivity, score: DayScore): QuestMetrics {
  const activeSources = Object.keys(score.breakdown).filter((k) => k !== "breadth" && k !== "quests").length;
  return {
    focusSessions: a.focus.length,
    focusMinutes: a.focus.reduce((acc, s) => acc + (Number(s.minutes) || 0), 0),
    timetrackerEntries: a.timetracker,
    distinctTrackers: a.trackerTypes.length,
    pomodoros: a.pomodoro,
    todos: a.todos,
    habits: a.habits,
    journalEntries: a.journal,
    workouts: a.workout,
    booksFinished: a.reading,
    notes: a.notes,
    logEntries: a.logs,
    activeSources,
  };
}

export interface QuestDef {
  key: string;
  label: string;
  description: string;
  metric: keyof QuestMetrics;
  target: number;
  reward: number;
  icon: string;
}

export const DAILY_QUEST_COUNT = 3;
export const ALL_COMPLETE_BONUS = 50;

export const QUEST_POOL: QuestDef[] = [
  { key: "focus_one", label: "Deep work", description: "Complete a focus session", metric: "focusSessions", target: 1, reward: 20, icon: "◉" },
  { key: "focus_hour", label: "In the zone", description: "Focus for 60 minutes", metric: "focusMinutes", target: 60, reward: 25, icon: "◎" },
  { key: "pomo_two", label: "Two pomodoros", description: "Finish 2 pomodoros", metric: "pomodoros", target: 2, reward: 20, icon: "⏱" },
  { key: "todos_five", label: "Clear the deck", description: "Complete 5 todos", metric: "todos", target: 5, reward: 20, icon: "✓" },
  { key: "habits_three", label: "Habit hat-trick", description: "Check in 3 habits", metric: "habits", target: 3, reward: 20, icon: "⊙" },
  { key: "journal_one", label: "Reflect", description: "Write a journal entry", metric: "journalEntries", target: 1, reward: 20, icon: "✎" },
  { key: "track_three", label: "Check your stats", description: "Log 3 different trackers", metric: "distinctTrackers", target: 3, reward: 20, icon: "▦" },
  { key: "time_log", label: "Account for it", description: "Log time in 3 categories", metric: "timetrackerEntries", target: 3, reward: 20, icon: "⌚" },
  { key: "workout_one", label: "Move", description: "Log a workout", metric: "workouts", target: 1, reward: 20, icon: "✚" },
  { key: "notes_one", label: "Capture a thought", description: "Write a note", metric: "notes", target: 1, reward: 15, icon: "✐" },
  { key: "breadth_four", label: "Well-rounded", description: "Use 4 different apps", metric: "activeSources", target: 4, reward: 25, icon: "◈" },
];

/** Deterministic 32-bit FNV-1a hash. No Math.random — stable across renders/processes. */
export function questSeed(userId: string, day: string): number {
  const str = `${userId}:${day}`;
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * The `count` quests offered on a given local day. Deterministic shuffle: sort
 * pool indices by their per-index seed, take the first `count`. Stable, no repeats.
 */
export function pickDailyQuests(userId: string, day: string, count = DAILY_QUEST_COUNT): QuestDef[] {
  return QUEST_POOL.map((_, i) => i)
    .sort((a, b) => questSeed(userId, `${day}:${a}`) - questSeed(userId, `${day}:${b}`))
    .slice(0, count)
    .map((i) => QUEST_POOL[i]);
}

export interface QuestStatus {
  def: QuestDef;
  current: number;
  target: number;
  done: boolean;
}

export function questStatuses(quests: QuestDef[], metrics: QuestMetrics): QuestStatus[] {
  return quests.map((def) => {
    const current = metrics[def.metric];
    return { def, current, target: def.target, done: current >= def.target };
  });
}

/**
 * Quest XP for a day: rewards for claimed keys that are in the day's chosen set,
 * plus the all-complete bonus iff every chosen quest is claimed. Derived from the
 * claimed rows, not live metrics, so the reward survives later data deletion.
 */
export function questPointsForDay(chosen: QuestDef[], claimedKeys: Set<string>): number {
  let pts = 0;
  let allClaimed = chosen.length > 0;
  for (const q of chosen) {
    if (claimedKeys.has(q.key)) pts += q.reward;
    else allClaimed = false;
  }
  if (allClaimed) pts += ALL_COMPLETE_BONUS;
  return pts;
}
