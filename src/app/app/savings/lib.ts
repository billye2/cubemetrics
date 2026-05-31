// Pure savings math: totals, pace, projected finish, chart series, recurring
// hints, and multi-currency formatting — kept free of React/DB so it can be
// unit-tested. Dates are YYYY-MM-DD strings (date-only, no TZ drift).

export interface ContributionRow {
  id: number;
  goal_id: number;
  amount: number;
  contributed_on: string; // YYYY-MM-DD
  note: string;
  created_at: string;
}

export interface GoalRow {
  id: number;
  title: string;
  target_value: number | null;
  due_date: string | null; // YYYY-MM-DD
  status: string;
  currency?: string; // ISO 4217, e.g. "USD" (defaults to USD when absent)
  created_at: string;
}

const DAY = 86_400_000;

function parseDateOnly(d: string): Date {
  const [y, m, day] = d.split("-").map(Number);
  return new Date(y, (m || 1) - 1, day || 1);
}

// ---------------------------------------------------------------------------
// Multi-currency formatting (P3)
// ---------------------------------------------------------------------------

/** Supported currencies offered in the picker. */
export const CURRENCIES = [
  "USD",
  "EUR",
  "GBP",
  "JPY",
  "CAD",
  "AUD",
  "INR",
  "CNY",
  "BRL",
  "MXN",
  "CHF",
  "SEK",
] as const;

export type CurrencyCode = (typeof CURRENCIES)[number];

export const DEFAULT_CURRENCY = "USD";

/** Normalize / validate a currency code, falling back to USD. */
export function normalizeCurrency(code: string | null | undefined): string {
  if (!code) return DEFAULT_CURRENCY;
  const up = code.toUpperCase();
  return (CURRENCIES as readonly string[]).includes(up) ? up : DEFAULT_CURRENCY;
}

/** "$1,250.00" / "€1.250,00" — locale-aware, currency-aware. */
export function formatCurrency(amount: number, code = DEFAULT_CURRENCY): string {
  const cur = normalizeCurrency(code);
  const value = Number.isFinite(amount) ? amount : 0;
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: cur,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${cur} ${value.toFixed(2)}`;
  }
}

/** Compact currency for big hero numbers: "$12.3K", "$1.2M". */
export function formatCurrencyCompact(amount: number, code = DEFAULT_CURRENCY): string {
  const cur = normalizeCurrency(code);
  const value = Number.isFinite(amount) ? amount : 0;
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: cur,
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(value);
  } catch {
    return formatCurrency(value, cur);
  }
}

/** Whole days from `now` to `dateStr`; 0 = today, negative = past. */
export function daysUntil(dateStr: string, now: Date = new Date()): number {
  const target = parseDateOnly(dateStr);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((target.getTime() - today.getTime()) / DAY);
}

/** Sum of contribution amounts (the goal's derived current_value). */
export function totalSaved(contribs: ContributionRow[]): number {
  return contribs.reduce((acc, c) => acc + (Number(c.amount) || 0), 0);
}

/** 0..1 progress toward target; 0 when no/zero target. */
export function progressFraction(saved: number, target: number | null): number {
  if (!target || target <= 0) return 0;
  return Math.min(1, saved / target);
}

/** Whole months left until due_date, never negative. ~30.44 days/month. */
export function monthsLeft(dueDate: string | null, now: Date = new Date()): number | null {
  if (!dueDate) return null;
  const days = daysUntil(dueDate, now);
  return Math.max(0, Math.round((days / 30.44) * 10) / 10);
}

/**
 * Required monthly contribution to hit `target` from `saved` by `dueDate`.
 * null when there's no target/due, 0 when already met.
 */
export function requiredMonthly(
  saved: number,
  target: number | null,
  dueDate: string | null,
  now: Date = new Date()
): number | null {
  if (!target || target <= 0 || !dueDate) return null;
  const remaining = target - saved;
  if (remaining <= 0) return 0;
  const months = monthsLeft(dueDate, now);
  if (months === null) return null;
  if (months <= 0) return remaining; // due now/overdue → need it all
  return remaining / months;
}

/**
 * Actual recent monthly pace: total contributed over the span of dates / months
 * elapsed (min 1 month so a single deposit doesn't read as infinite pace).
 */
export function actualMonthlyPace(
  contribs: ContributionRow[],
  now: Date = new Date()
): number {
  if (contribs.length === 0) return 0;
  const total = totalSaved(contribs);
  const dates = contribs.map((c) => parseDateOnly(c.contributed_on).getTime());
  const earliest = Math.min(...dates);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const spanDays = Math.max(1, (today - earliest) / DAY);
  const months = Math.max(1, spanDays / 30.44);
  return total / months;
}

export type PaceTone = "ahead" | "behind" | "on" | "unknown";

/** Compare actual pace to required pace. */
export function paceComparison(
  actual: number,
  required: number | null
): PaceTone {
  if (required === null) return "unknown";
  if (required === 0) return "ahead"; // target already met
  if (actual >= required * 1.02) return "ahead";
  if (actual <= required * 0.98) return "behind";
  return "on";
}

/**
 * Projected finish date from recent pace: extrapolate remaining / monthly pace.
 * Returns a YYYY-MM-01 month string ("2026-10-01") or null if unknowable.
 */
export function projectedFinish(
  saved: number,
  target: number | null,
  pace: number,
  now: Date = new Date()
): string | null {
  if (!target || target <= 0) return null;
  const remaining = target - saved;
  if (remaining <= 0) return null; // already done
  if (pace <= 0) return null;
  const months = remaining / pace;
  const d = new Date(now.getFullYear(), now.getMonth(), 1);
  d.setMonth(d.getMonth() + Math.ceil(months));
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-01`;
}

/** "Oct 2026" from a YYYY-MM-DD string. */
export function monthLabel(dateStr: string): string {
  return parseDateOnly(dateStr).toLocaleDateString(undefined, {
    month: "short",
    year: "numeric",
  });
}

export interface GoalStats {
  saved: number;
  fraction: number;
  remaining: number;
  monthsLeft: number | null;
  requiredMonthly: number | null;
  actualMonthly: number;
  pace: PaceTone;
  projected: string | null;
  complete: boolean;
}

/** One goal's full derived stats from its contribution rows. */
export function statsFor(
  goal: GoalRow,
  contribs: ContributionRow[],
  now: Date = new Date()
): GoalStats {
  const saved = totalSaved(contribs);
  const target = goal.target_value;
  const fraction = progressFraction(saved, target);
  const remaining = target && target > 0 ? Math.max(0, target - saved) : 0;
  const required = requiredMonthly(saved, target, goal.due_date, now);
  const actual = actualMonthlyPace(contribs, now);
  return {
    saved,
    fraction,
    remaining,
    monthsLeft: monthsLeft(goal.due_date, now),
    requiredMonthly: required,
    actualMonthly: actual,
    pace: paceComparison(actual, required),
    projected: projectedFinish(saved, target, actual, now),
    complete: !!target && target > 0 && saved >= target,
  };
}

// ---------------------------------------------------------------------------
// P3 — contribution chart series
// ---------------------------------------------------------------------------

export interface CumulativePoint {
  date: string; // YYYY-MM-DD
  total: number; // running cumulative total at/after this contribution
}

/**
 * Cumulative-savings series, oldest → newest. Each point is the running total
 * after that contribution. Empty input → empty series.
 */
export function cumulativeSeries(contribs: ContributionRow[]): CumulativePoint[] {
  const sorted = [...contribs].sort((a, b) =>
    a.contributed_on < b.contributed_on ? -1 : a.contributed_on > b.contributed_on ? 1 : 0
  );
  let running = 0;
  return sorted.map((c) => {
    running += Number(c.amount) || 0;
    return { date: c.contributed_on, total: Math.round(running * 100) / 100 };
  });
}

export interface MonthlyBucket {
  month: string; // YYYY-MM
  label: string; // "Oct"
  total: number; // sum of deposits that month
}

/**
 * Per-month deposit totals for the last `count` calendar months (oldest →
 * newest), including zero-deposit months so the bar chart has no gaps.
 */
export function monthlyBuckets(
  contribs: ContributionRow[],
  count = 6,
  now: Date = new Date()
): MonthlyBucket[] {
  const sums = new Map<string, number>();
  for (const c of contribs) {
    const key = c.contributed_on.slice(0, 7); // YYYY-MM
    sums.set(key, (sums.get(key) ?? 0) + (Number(c.amount) || 0));
  }
  const out: MonthlyBucket[] = [];
  const base = new Date(now.getFullYear(), now.getMonth(), 1);
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(base.getFullYear(), base.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    out.push({
      month: key,
      label: d.toLocaleDateString(undefined, { month: "short" }),
      total: Math.round((sums.get(key) ?? 0) * 100) / 100,
    });
  }
  return out;
}

// ---------------------------------------------------------------------------
// P3 — recurring-contribution reminder
// ---------------------------------------------------------------------------

export interface RecurringHint {
  typicalAmount: number; // typical (median) deposit
  typicalDay: number; // 1..31, day of month deposits cluster around
  count: number; // how many deposits informed the hint
}

/**
 * Detect a recurring deposit pattern: a typical amount and day-of-month, from
 * the most recent deposits. Needs at least 3 to be meaningful; otherwise null.
 */
export function recurringHint(contribs: ContributionRow[]): RecurringHint | null {
  const positive = contribs.filter((c) => (Number(c.amount) || 0) > 0);
  if (positive.length < 3) return null;

  const recent = [...positive]
    .sort((a, b) => (a.contributed_on < b.contributed_on ? 1 : -1))
    .slice(0, 6);

  const amounts = recent.map((c) => Number(c.amount) || 0).sort((a, b) => a - b);
  const typicalAmount =
    amounts.length % 2 === 1
      ? amounts[(amounts.length - 1) / 2]
      : (amounts[amounts.length / 2 - 1] + amounts[amounts.length / 2]) / 2;

  const days = recent.map((c) => {
    const day = Number(c.contributed_on.slice(8, 10));
    return Number.isFinite(day) && day > 0 ? day : 1;
  });
  const typicalDay = Math.round(days.reduce((a, b) => a + b, 0) / days.length);

  return {
    typicalAmount: Math.round(typicalAmount * 100) / 100,
    typicalDay: Math.min(31, Math.max(1, typicalDay)),
    count: recent.length,
  };
}

/** "1st", "2nd", "23rd" … from a day number. */
export function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
