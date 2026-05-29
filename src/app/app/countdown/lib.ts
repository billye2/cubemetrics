export interface Countdown {
  id: number;
  title: string;
  target_date: string;
  target_time: string | null;
  category: string | null;
  recurring_yearly: boolean;
  note: string | null;
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
