// Pure data + helpers for the Meditation ("Bloom") app. No DB/React imports, so
// the math stays unit-testable. History entries are derived from daily_trackers
// rows (tracker_type "meditation"); minutes live in `value`, and the note holds
// JSON {label, sid} (falling back to a plain-string label for legacy rows).

export interface Session {
  id: string;
  title: string;
  teacher: string;
  cat: string;
  min: number;
  hue: number;
  blurb: string;
}

export const SESSIONS: Session[] = [
  { id: "s1", title: "Morning Clarity", teacher: "Maya Lin", cat: "Focus", min: 10, hue: 188, blurb: "Set a clear intention before the day pulls at you." },
  { id: "s2", title: "Box Breathing", teacher: "Devon Park", cat: "Breath", min: 5, hue: 158, blurb: "Four counts in, four held, four out. Steady the nerves." },
  { id: "s3", title: "Body Scan", teacher: "Aisha Rao", cat: "Calm", min: 15, hue: 24, blurb: "Release tension from the crown of your head to your toes." },
  { id: "s4", title: "Deep Sleep Drift", teacher: "Noah Vance", cat: "Sleep", min: 20, hue: 268, blurb: "A slow descent into rest. Best with the lights off." },
  { id: "s5", title: "Walking Meditation", teacher: "Maya Lin", cat: "Walk", min: 12, hue: 128, blurb: "Bring awareness to each step. Headphones in, eyes soft." },
  { id: "s6", title: "Reset in 3", teacher: "Devon Park", cat: "Breath", min: 3, hue: 200, blurb: "A pocket-sized pause between meetings." },
  { id: "s7", title: "Loving Kindness", teacher: "Aisha Rao", cat: "Calm", min: 14, hue: 340, blurb: "Send warmth outward, starting with yourself." },
  { id: "s8", title: "Focus Flow", teacher: "Noah Vance", cat: "Focus", min: 18, hue: 218, blurb: "Lock into deep work with a settled mind." },
  { id: "s9", title: "Evening Unwind", teacher: "Maya Lin", cat: "Sleep", min: 10, hue: 288, blurb: "Let the day go, one breath at a time." },
];

export const CATS = ["All", "Calm", "Focus", "Breath", "Sleep", "Walk"];
export const CATEGORY_HUE: Record<string, number> = { Calm: 24, Focus: 200, Breath: 158, Sleep: 268, Walk: 128 };
export const DEFAULT_GOAL = 20;
const DOW = ["S", "M", "T", "W", "T", "F", "S"];

export function sessionById(id: string | null | undefined): Session | undefined {
  return id ? SESSIONS.find((s) => s.id === id) : undefined;
}

export interface Entry {
  id: number;
  minutes: number;
  label: string;
  sid: string | null;
  createdAt: string;
}

interface RawRow {
  id: number;
  value: number | string | null;
  note: string | null;
  created_at: string;
}

/** Parse a daily_trackers row into a meditation entry (JSON note or plain label). */
export function parseEntry(row: RawRow): Entry {
  let label = "";
  let sid: string | null = null;
  if (row.note) {
    try {
      const p = JSON.parse(row.note) as { label?: string; sid?: string | null };
      if (p && typeof p === "object" && ("label" in p || "sid" in p)) {
        label = typeof p.label === "string" ? p.label : "";
        sid = typeof p.sid === "string" ? p.sid : null;
      } else {
        label = row.note;
      }
    } catch {
      label = row.note; // legacy plain-text note
    }
  }
  const minutes = Math.round(Number(row.value) || 0);
  return { id: row.id, minutes, label: label || `${minutes}-min sit`, sid, createdAt: row.created_at };
}

export function localDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Whole days between an entry's local day and today's local day (0 = today). */
export function dayAgoOf(createdAt: string, now: Date = new Date()): number {
  const e = new Date(createdAt);
  const eDay = new Date(e.getFullYear(), e.getMonth(), e.getDate());
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((today.getTime() - eDay.getTime()) / 86_400_000);
}

/** Minutes summed per dayAgo bucket. */
export function minutesByDay(entries: Entry[], now: Date = new Date()): Record<number, number> {
  const m: Record<number, number> = {};
  for (const e of entries) {
    const d = dayAgoOf(e.createdAt, now);
    if (d < 0) continue;
    m[d] = (m[d] || 0) + e.minutes;
  }
  return m;
}

export interface DayBucket {
  dayAgo: number;
  dow: string;
  min: number;
}

/** Last N days oldest→newest, with weekday letters, for the bar chart. */
export function lastNDays(entries: Entry[], n: number, now: Date = new Date()): DayBucket[] {
  const byDay = minutesByDay(entries, now);
  const out: DayBucket[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    d.setDate(d.getDate() - i);
    out.push({ dayAgo: i, dow: DOW[d.getDay()], min: byDay[i] || 0 });
  }
  return out;
}

export function todayMinutes(entries: Entry[], now: Date = new Date()): number {
  return entries.reduce((s, e) => (dayAgoOf(e.createdAt, now) === 0 ? s + e.minutes : s), 0);
}

/** Consecutive days with any minutes, ending today (or yesterday if today is empty). */
export function calcStreak(entries: Entry[], now: Date = new Date()): number {
  const byDay = minutesByDay(entries, now);
  let streak = 0;
  let i = (byDay[0] || 0) > 0 ? 0 : 1;
  for (; i < 366; i++) {
    if ((byDay[i] || 0) > 0) streak++;
    else break;
  }
  return streak;
}

/** Minutes per category (via the session each entry was tagged with). */
export function minutesByCategory(entries: Entry[]): [string, number][] {
  const m: Record<string, number> = {};
  for (const e of entries) {
    const s = sessionById(e.sid);
    if (!s) continue;
    m[s.cat] = (m[s.cat] || 0) + e.minutes;
  }
  return Object.entries(m).sort((a, b) => b[1] - a[1]);
}

export function totalMinutes(entries: Entry[]): number {
  return entries.reduce((s, e) => s + e.minutes, 0);
}

export function mmss(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}

export interface Badge {
  icon: string;
  label: string;
  got: boolean;
  hue: number;
}

/** Achievements derived from real stats — earned tiles light up, the rest are locked. */
export function achievements(entries: Entry[], streak: number): Badge[] {
  const total = totalMinutes(entries);
  const days = new Set(entries.map((e) => localDateKey(new Date(e.createdAt)))).size;
  const hasEarly = entries.some((e) => new Date(e.createdAt).getHours() < 8 && e.minutes > 0);
  const hasNight = entries.some((e) => new Date(e.createdAt).getHours() >= 21 && e.minutes > 0);
  return [
    { icon: "flame", label: "7-day streak", got: streak >= 7, hue: 30 },
    { icon: "clock", label: "10 hours", got: total >= 600, hue: 200 },
    { icon: "star", label: "Early bird", got: hasEarly, hue: 50 },
    { icon: "moon", label: "Night owl", got: hasNight, hue: 268 },
    { icon: "leaf", label: "30 days", got: days >= 30, hue: 140 },
    { icon: "bolt", label: "Power week", got: weekTotal(entries) >= 120, hue: 220 },
  ];
}

function weekTotal(entries: Entry[], now: Date = new Date()): number {
  return lastNDays(entries, 7, now).reduce((s, d) => s + d.min, 0);
}
