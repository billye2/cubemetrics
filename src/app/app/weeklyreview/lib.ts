// Pure helpers for the Weekly Review app — ISO-week math and stat formatting.
// Weeks run Monday → Sunday. A review is keyed to its Monday (`week_start`, a
// YYYY-MM-DD date string in the user's local time).

export interface WeeklyReview {
  id: number;
  week_start: string; // YYYY-MM-DD (Monday)
  wins: string;
  misses: string;
  lessons: string;
  next_focus: string;
  created_at: string;
}

/** Format a Date as a local YYYY-MM-DD string (no UTC shift). */
export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Parse a YYYY-MM-DD string into a local Date at midnight. */
export function parseISODate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** Monday (local midnight) of the week containing `d`. */
export function weekStart(d: Date): Date {
  const out = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  // JS getDay(): Sun=0..Sat=6. Shift so Monday=0.
  const offset = (out.getDay() + 6) % 7;
  out.setDate(out.getDate() - offset);
  return out;
}

/** Sunday (local midnight) of the week containing `d`. */
export function weekEnd(d: Date): Date {
  const start = weekStart(d);
  start.setDate(start.getDate() + 6);
  return start;
}

/** Add `n` weeks to a week-start date, returning a new Monday. */
export function addWeeks(weekStartDate: Date, n: number): Date {
  const out = new Date(weekStartDate);
  out.setDate(out.getDate() + n * 7);
  return out;
}

/**
 * ISO-8601 week number (1..53). The ISO week year can differ from the calendar
 * year near Jan/Dec boundaries, so we return both.
 */
export function isoWeek(d: Date): { year: number; week: number } {
  // Copy, normalize to Thursday of this week (ISO weeks belong to the year of
  // their Thursday).
  const date = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = (date.getDay() + 6) % 7; // Mon=0..Sun=6
  date.setDate(date.getDate() - day + 3); // Thursday
  const thursday = date.getTime();
  date.setMonth(0, 1); // Jan 1
  if (date.getDay() !== 4) {
    date.setMonth(0, 1 + ((4 - date.getDay() + 7) % 7));
  }
  const week = 1 + Math.round((thursday - date.getTime()) / (7 * 86_400_000));
  // ISO week-year = year of the Thursday.
  const thu = new Date(thursday);
  return { year: thu.getFullYear(), week };
}

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/** "May 26 – Jun 1" (omits the month on the end when it matches the start). */
export function formatRange(startISO: string): string {
  const start = parseISODate(startISO);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const sM = MONTHS[start.getMonth()];
  const eM = MONTHS[end.getMonth()];
  if (sM === eM) return `${sM} ${start.getDate()} – ${end.getDate()}`;
  return `${sM} ${start.getDate()} – ${eM} ${end.getDate()}`;
}

/** A short label like "This week", "Last week", or "3 weeks ago". */
export function relativeWeekLabel(startISO: string, today: Date): string {
  const thisStart = weekStart(today);
  const target = parseISODate(startISO);
  const diffWeeks = Math.round((thisStart.getTime() - target.getTime()) / (7 * 86_400_000));
  if (diffWeeks === 0) return "This week";
  if (diffWeeks === 1) return "Last week";
  if (diffWeeks === -1) return "Next week";
  if (diffWeeks > 1) return `${diffWeeks} weeks ago`;
  return `${-diffWeeks} weeks ahead`;
}

/** Whole minutes → "Xh Ym" / "Ym" / "0m". */
export function formatMinutes(mins: number): string {
  const m = Math.round(mins);
  if (m <= 0) return "0m";
  const h = Math.floor(m / 60);
  const rem = m % 60;
  if (h === 0) return `${rem}m`;
  if (rem === 0) return `${h}h`;
  return `${h}h ${rem}m`;
}

/** Inclusive UTC-ish day-range bounds for querying `*_at` timestamps over a week. */
export function weekRange(startISO: string): { from: string; to: string } {
  const start = parseISODate(startISO);
  const end = new Date(start);
  end.setDate(end.getDate() + 7); // exclusive upper bound (next Monday 00:00)
  return { from: toISODate(start), to: toISODate(end) };
}
