export interface Countdown {
  id: number;
  title: string;
  target_date: string;
  target_time: string | null;
  category: string | null;
  recurring_yearly: boolean;
  note: string | null;
  /** Progress-ring anchor: how long ago the countdown was created. Optional so
   *  pure-logic callers (and older rows) don't have to supply it. */
  created_at?: string | null;
}

export interface ResolvedCountdown extends Countdown {
  nextAt: Date;
  isPast: boolean;
}

const ZERO_TIME = "00:00:00";

function buildLocalDate(dateStr: string, timeStr: string | null): Date {
  const [y, m, d] = dateStr.split("-").map((s) => parseInt(s, 10));
  const time = (timeStr ?? ZERO_TIME).slice(0, 8);
  const [hh, mm, ss] = time.split(":").map((s) => parseInt(s, 10));
  return new Date(y, (m || 1) - 1, d || 1, hh || 0, mm || 0, ss || 0);
}

/**
 * For a recurring-yearly countdown, returns the next occurrence at-or-after
 * `now` (anchored to the original date's month/day, preserving any time of
 * day). For non-recurring countdowns, returns the original target.
 */
export function nextOccurrence(c: Countdown, now: Date = new Date()): Date {
  const target = buildLocalDate(c.target_date, c.target_time);
  if (!c.recurring_yearly) return target;
  const candidate = new Date(
    now.getFullYear(),
    target.getMonth(),
    target.getDate(),
    target.getHours(),
    target.getMinutes(),
    target.getSeconds(),
  );
  if (candidate.getTime() < now.getTime()) {
    candidate.setFullYear(candidate.getFullYear() + 1);
  }
  return candidate;
}

export function resolveAll(rows: Countdown[], now: Date = new Date()): ResolvedCountdown[] {
  return rows
    .map((r) => {
      const nextAt = nextOccurrence(r, now);
      return { ...r, nextAt, isPast: nextAt.getTime() < now.getTime() };
    })
    .sort((a, b) => a.nextAt.getTime() - b.nextAt.getTime());
}

export interface Breakdown {
  totalMs: number;
  past: boolean;
  years: number;
  months: number;
  weeks: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

/**
 * Calendar-aware breakdown from `now` to `target`: walks the calendar by
 * years → months → days (so "1 month" really means a calendar month, not
 * 30 days) and then breaks the residual into weeks/hours/minutes/seconds.
 * `past` is true when the target is already behind `now`.
 */
export function breakdown(now: Date, target: Date): Breakdown {
  const past = target.getTime() < now.getTime();
  const [a, b] = past ? [target, now] : [now, target];

  let years = b.getFullYear() - a.getFullYear();
  let months = b.getMonth() - a.getMonth();
  let days = b.getDate() - a.getDate();
  let hours = b.getHours() - a.getHours();
  let minutes = b.getMinutes() - a.getMinutes();
  let seconds = b.getSeconds() - a.getSeconds();

  if (seconds < 0) { seconds += 60; minutes -= 1; }
  if (minutes < 0) { minutes += 60; hours -= 1; }
  if (hours < 0) { hours += 24; days -= 1; }
  if (days < 0) {
    const prevMonth = new Date(b.getFullYear(), b.getMonth(), 0);
    days += prevMonth.getDate();
    months -= 1;
  }
  if (months < 0) { months += 12; years -= 1; }

  const weeks = Math.floor(days / 7);
  days = days - weeks * 7;

  return {
    totalMs: Math.abs(b.getTime() - a.getTime()),
    past,
    years,
    months,
    weeks,
    days,
    hours,
    minutes,
    seconds,
  };
}

export type Granularity = "imminent" | "today" | "thisWeek" | "thisMonth" | "far";

export function pickGranularity(totalMs: number): Granularity {
  const hour = 60 * 60 * 1000;
  const day = 24 * hour;
  const week = 7 * day;
  const month = 30 * day;
  if (totalMs < hour) return "imminent";
  if (totalMs < day) return "today";
  if (totalMs < week) return "thisWeek";
  if (totalMs < month) return "thisMonth";
  return "far";
}

/**
 * Adaptive formatter: only shows the units that matter at the current
 * distance, so far-off targets read "3 months, 2 weeks" not "0y 3mo 2w 0d…".
 */
export function formatBreakdown(b: Breakdown, g: Granularity): string {
  const join = (parts: string[]) => parts.join(", ");
  if (g === "imminent") {
    if (b.minutes === 0 && b.seconds < 60 && b.hours === 0) {
      return b.seconds <= 1 ? "now" : `${b.seconds}s`;
    }
    return join([
      b.minutes > 0 ? `${b.minutes}m` : "",
      `${b.seconds}s`,
    ].filter(Boolean));
  }
  if (g === "today") {
    return join([
      b.hours > 0 ? `${b.hours}h` : "",
      `${b.minutes}m`,
    ].filter(Boolean));
  }
  if (g === "thisWeek") {
    return join([
      b.days > 0 ? `${b.days} day${b.days === 1 ? "" : "s"}` : "",
      b.hours > 0 ? `${b.hours}h` : "",
    ].filter(Boolean)) || `${b.minutes}m`;
  }
  if (g === "thisMonth") {
    return join([
      b.weeks > 0 ? `${b.weeks} week${b.weeks === 1 ? "" : "s"}` : "",
      b.days > 0 ? `${b.days} day${b.days === 1 ? "" : "s"}` : "",
    ].filter(Boolean)) || "less than a day";
  }
  return join([
    b.years > 0 ? `${b.years} year${b.years === 1 ? "" : "s"}` : "",
    b.months > 0 ? `${b.months} month${b.months === 1 ? "" : "s"}` : "",
    b.weeks > 0 ? `${b.weeks} week${b.weeks === 1 ? "" : "s"}` : "",
  ].filter(Boolean)) || "today";
}

// ─────────────────────── "Calm Color" presentation ───────────────────────
// Playful per-category palette (adapted to the app's dark/zinc surfaces — the
// color carries through the ring, tint, and figures). Unknown/legacy category
// names fall back to a neutral token.

export interface CategoryToken {
  color: string;
  emoji: string;
}

export const CATEGORY_TOKENS: Record<string, CategoryToken> = {
  Work: { color: "#6b8aff", emoji: "💼" },
  Fun: { color: "#e0a52a", emoji: "🎉" },
  Travel: { color: "#22b3a3", emoji: "✈️" },
  Event: { color: "#e86aa0", emoji: "🥂" },
  Home: { color: "#6cbf66", emoji: "🏡" },
  Health: { color: "#8c80f5", emoji: "🏃" },
  Personal: { color: "#9aa3b2", emoji: "⭐" },
};

export const CATEGORY_NAMES = Object.keys(CATEGORY_TOKENS);

const FALLBACK_TOKEN: CategoryToken = { color: "#9aa3b2", emoji: "🗓️" };

export function categoryToken(name: string | null | undefined): CategoryToken {
  if (!name) return FALLBACK_TOKEN;
  return CATEGORY_TOKENS[name] ?? FALLBACK_TOKEN;
}

/** `#rrggbb` + alpha → `rgba(...)`. */
export function hexAlpha(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

export interface FuzzyParts {
  big: string;
  small: string;
  today?: boolean;
}

/**
 * Friendly, two-unit coarse countdown ("3 days" + "5h", "2 weeks" + "3 days").
 * Matches the design's `fuzzyParts`. Past → `{ big: "Today" }`.
 */
export function fuzzyParts(ms: number): FuzzyParts {
  if (ms <= 0) return { big: "Today", small: "", today: true };
  const min = Math.floor(ms / 60000);
  const hr = Math.floor(min / 60);
  const day = Math.floor(hr / 24);
  if (day < 1) {
    const m = min % 60;
    return { big: hr > 0 ? `${hr}h` : `${m}m`, small: hr > 0 ? `${m}m` : "" };
  }
  if (day < 7) {
    const h = hr - day * 24;
    return { big: `${day} day${day > 1 ? "s" : ""}`, small: h > 0 ? `${h}h` : "" };
  }
  if (day < 31) {
    const w = Math.floor(day / 7);
    const d = day % 7;
    return { big: `${w} week${w > 1 ? "s" : ""}`, small: d > 0 ? `${d} day${d > 1 ? "s" : ""}` : "" };
  }
  const mo = Math.floor(day / 30.44);
  const remDay = Math.round(day - mo * 30.44);
  const w = Math.floor(remDay / 7);
  if (mo < 12) {
    return { big: `${mo} month${mo > 1 ? "s" : ""}`, small: w > 0 ? `${w} week${w > 1 ? "s" : ""}` : "" };
  }
  const y = Math.floor(mo / 12);
  const remMo = mo % 12;
  return { big: `${y} year${y > 1 ? "s" : ""}`, small: remMo > 0 ? `${remMo} mo` : "" };
}

export type Bucket = "This week" | "This month" | "Later" | "Past";
export const BUCKET_ORDER: Bucket[] = ["This week", "This month", "Later", "Past"];

export function bucketOf(nextAt: Date, now: Date): Bucket {
  const ms = nextAt.getTime() - now.getTime();
  if (ms <= 0) return "Past";
  const days = ms / 86400000;
  if (days <= 7) return "This week";
  if (days <= 31) return "This month";
  return "Later";
}

/**
 * Fraction of the wait already elapsed (0–1), for the progress ring. Anchored
 * on the row's `created_at`; for a yearly recurrence, anchored one year before
 * the next occurrence so the ring reflects this cycle, not the original create.
 */
export function progressFraction(c: Countdown, nextAt: Date, now: Date): number {
  let start: number;
  if (c.recurring_yearly) {
    const a = new Date(nextAt);
    a.setFullYear(a.getFullYear() - 1);
    start = a.getTime();
  } else if (c.created_at) {
    start = new Date(c.created_at).getTime();
  } else {
    return 0;
  }
  const end = nextAt.getTime();
  if (end <= start) return 1;
  return Math.max(0, Math.min(1, (now.getTime() - start) / (end - start)));
}
