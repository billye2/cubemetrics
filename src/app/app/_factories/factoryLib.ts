// Shared helpers for the factory views (goal / finance / checklist / logbook).

const CURRENCY_FORMATTER = new Intl.NumberFormat(undefined, {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

const CURRENCY_FORMATTER_WHOLE = new Intl.NumberFormat(undefined, {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

/** Money with cents, e.g. $1,250.00 */
export function currency(value: number): string {
  return CURRENCY_FORMATTER.format(value || 0);
}

/** Money without cents when whole, used for big hero totals. */
export function currencyCompact(value: number): string {
  return Number.isInteger(value) ? CURRENCY_FORMATTER_WHOLE.format(value) : CURRENCY_FORMATTER.format(value);
}

/** Midnight-local of a YYYY-MM-DD date string (date-only, no timezone surprises). */
export function parseDateOnly(d: string): Date {
  const [y, m, day] = d.split("-").map(Number);
  return new Date(y, (m || 1) - 1, day || 1);
}

/**
 * Whole calendar days from today to the given date string.
 * 0 = today, negative = in the past (overdue), positive = future.
 */
export function daysUntil(dateStr: string, now: Date = new Date()): number {
  const target = parseDateOnly(dateStr);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

export interface DueInfo {
  days: number;
  label: string;
  /** "overdue" | "today" | "soon" (≤3d) | "future" */
  tone: "overdue" | "today" | "soon" | "future";
}

/** Human "due in 3 days" / "2 days overdue" / "today" plus an urgency tone. */
export function dueInfo(dateStr: string, now: Date = new Date()): DueInfo {
  const days = daysUntil(dateStr, now);
  if (days < 0) {
    const n = Math.abs(days);
    return { days, label: n === 1 ? "1 day overdue" : `${n} days overdue`, tone: "overdue" };
  }
  if (days === 0) return { days, label: "due today", tone: "today" };
  if (days === 1) return { days, label: "due tomorrow", tone: "soon" };
  if (days <= 3) return { days, label: `due in ${days} days`, tone: "soon" };
  if (days <= 30) return { days, label: `due in ${days} days`, tone: "future" };
  const weeks = Math.round(days / 7);
  if (days <= 70) return { days, label: `in ${weeks} weeks`, tone: "future" };
  const months = Math.round(days / 30);
  return { days, label: `in ${months} months`, tone: "future" };
}

export function shortDate(dateStr: string): string {
  return parseDateOnly(dateStr).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export interface TimeProgress {
  /** Fraction of the window already elapsed, 0..1. */
  elapsedPct: number;
  daysTotal: number;
  daysElapsed: number;
  /** Whole days remaining; negative once overdue. */
  daysLeft: number;
  overdue: boolean;
}

/**
 * Time elapsed vs. remaining across a goal's window (created → due). Drives the
 * "how much of your runway is gone" bar that complements value progress.
 */
export function timeProgress(
  createdAt: string,
  dueDate: string,
  now: Date = new Date(),
): TimeProgress {
  const c = new Date(createdAt);
  const createdDay = new Date(c.getFullYear(), c.getMonth(), c.getDate());
  const dueDay = parseDateOnly(dueDate);
  const daysTotal = Math.max(1, Math.round((dueDay.getTime() - createdDay.getTime()) / 86_400_000));
  const daysLeft = daysUntil(dueDate, now);
  const daysElapsed = Math.max(0, Math.min(daysTotal, daysTotal - daysLeft));
  return {
    elapsedPct: Math.max(0, Math.min(1, daysElapsed / daysTotal)),
    daysTotal,
    daysElapsed,
    daysLeft,
    overdue: daysLeft < 0,
  };
}

export type Pace = "ahead" | "on" | "behind";

/**
 * Compare value progress (0..100) against time elapsed (0..1). "Behind" only
 * once you've meaningfully fallen behind the clock, so it doesn't nag on day one.
 */
export function goalPace(valuePct: number, elapsedPct: number): Pace {
  const diff = valuePct - elapsedPct * 100;
  if (diff >= 5) return "ahead";
  if (diff <= -12) return "behind";
  return "on";
}

export const PACE_LABEL: Record<Pace, string> = {
  ahead: "Ahead of pace",
  on: "On track",
  behind: "Behind pace",
};

// ─────────────────────── due-date bucketing (checklist) ───────────────────────
// Group dated items the way Countdown groups events, so a checklist reads as
// "what's overdue / due today / this week" instead of one long flat list.

export type DueBucket = "Overdue" | "Today" | "This week" | "Later" | "Someday";
export const DUE_BUCKET_ORDER: DueBucket[] = ["Overdue", "Today", "This week", "Later", "Someday"];

export function dueBucket(due: string | null | undefined, now: Date = new Date()): DueBucket {
  if (!due) return "Someday";
  const days = daysUntil(due.slice(0, 10), now);
  if (days < 0) return "Overdue";
  if (days === 0) return "Today";
  if (days <= 7) return "This week";
  return "Later";
}

/** Count how many of the given ISO timestamps fall within the last `days` days. */
export function countWithinDays(
  timestamps: string[],
  days: number,
  now: Date = new Date(),
): number {
  const cutoff = now.getTime() - days * 86_400_000;
  return timestamps.filter((t) => new Date(t).getTime() >= cutoff).length;
}

/** Normalize a recurrence/frequency string to a monthly multiplier. */
export function monthlyFactor(frequency: string | null | undefined): number {
  switch ((frequency || "monthly").toLowerCase()) {
    case "weekly":
      return 52 / 12;
    case "yearly":
    case "annual":
    case "annually":
      return 1 / 12;
    case "quarterly":
      return 1 / 3;
    case "daily":
      return 365 / 12;
    case "monthly":
    default:
      return 1;
  }
}
