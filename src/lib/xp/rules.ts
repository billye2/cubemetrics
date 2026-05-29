// The XP economy. All point values and per-source daily caps live here so the
// economy can be tuned in one place. scoreDay() is pure and unit-tested.
//
// XP is derived from the *current state* of each app's rows for a given local
// day, then capped per source — so toggling a todo done/undone/done can't farm
// points (the day is recomputed from current rows, not from events).

export interface DayActivity {
  focus: { minutes: number }[]; // one entry per focus session that day
  timetracker: number; // count of time-tracker entries
  trackerTypes: string[]; // distinct *other* tracker types logged that day
  pomodoro: number; // completed pomodoros
  todos: number; // todos completed
  habits: number; // habit check-ins
  journal: number; // journal entries
  workout: number; // workout sessions
  reading: number; // books finished
  notes: number; // notes created
  logs: number; // logbook entries created
  expenses: number; // expenses logged
  finance: number; // finance items logged
}

export function emptyActivity(): DayActivity {
  return {
    focus: [],
    timetracker: 0,
    trackerTypes: [],
    pomodoro: 0,
    todos: 0,
    habits: 0,
    journal: 0,
    workout: 0,
    reading: 0,
    notes: 0,
    logs: 0,
    expenses: 0,
    finance: 0,
  };
}

// Per-source caps (points/day). Tune freely.
const CAP = {
  focus: 60,
  timetracker: 25,
  trackers: 30,
  pomodoro: 40,
  todos: 50,
  habits: 40,
  journal: 15,
  workout: 30,
  reading: 60,
  notes: 15,
  logs: 15,
  expenses: 10,
  finance: 10,
} as const;

/** Bonus per app first touched that day — rewards breadth over grinding one app. */
const BREADTH_BONUS = 5;
/** Safety ceiling on a single day's total. */
const GLOBAL_DAILY_CAP = 300;

export const SOURCE_LABELS: Record<string, string> = {
  focus: "Focus",
  timetracker: "Time Tracker",
  trackers: "Trackers",
  pomodoro: "Pomodoro",
  todos: "Todos",
  habits: "Habits",
  journal: "Journal",
  workout: "Workout",
  reading: "Reading",
  notes: "Notes",
  logs: "Logs",
  expenses: "Expenses",
  finance: "Finance",
  breadth: "Breadth bonus",
};

const clampCap = (raw: number, cap: number) => Math.max(0, Math.min(raw, cap));

export interface DayScore {
  points: number;
  breakdown: Record<string, number>;
}

/** Score one local day's activity into capped per-source points + a total. */
export function scoreDay(a: DayActivity): DayScore {
  const raw: Record<string, number> = {
    focus: clampCap(
      a.focus.reduce((acc, s) => acc + 10 + Math.floor(Math.max(0, s.minutes) / 10), 0),
      CAP.focus,
    ),
    timetracker: clampCap(a.timetracker * 5, CAP.timetracker),
    trackers: clampCap(a.trackerTypes.length * 3, CAP.trackers),
    pomodoro: clampCap(a.pomodoro * 10, CAP.pomodoro),
    todos: clampCap(a.todos * 5, CAP.todos),
    habits: clampCap(a.habits * 8, CAP.habits),
    journal: clampCap(a.journal * 15, CAP.journal),
    workout: clampCap(a.workout * 15, CAP.workout),
    reading: clampCap(a.reading * 30, CAP.reading),
    notes: clampCap(a.notes * 3, CAP.notes),
    logs: clampCap(a.logs * 3, CAP.logs),
    expenses: clampCap(a.expenses * 2, CAP.expenses),
    finance: clampCap(a.finance * 2, CAP.finance),
  };

  const breakdown: Record<string, number> = {};
  let activeSources = 0;
  for (const [key, val] of Object.entries(raw)) {
    if (val > 0) {
      breakdown[key] = val;
      activeSources++;
    }
  }
  if (activeSources > 0) breakdown.breadth = activeSources * BREADTH_BONUS;

  const sum = Object.values(breakdown).reduce((acc, v) => acc + v, 0);
  return { points: Math.min(sum, GLOBAL_DAILY_CAP), breakdown };
}
