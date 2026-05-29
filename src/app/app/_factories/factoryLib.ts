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
