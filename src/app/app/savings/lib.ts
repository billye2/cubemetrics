// Pure savings math: totals, pace, and projected finish — kept free of React/DB
// so it can be unit-tested. Dates are YYYY-MM-DD strings (date-only, no TZ drift).

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
  created_at: string;
}

const DAY = 86_400_000;

function parseDateOnly(d: string): Date {
  const [y, m, day] = d.split("-").map(Number);
  return new Date(y, (m || 1) - 1, day || 1);
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
