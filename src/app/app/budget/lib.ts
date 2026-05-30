// Pure budget math: month arithmetic, planned-vs-actual line building, totals,
// and the pace indicator — kept free of React/DB so it can be unit-tested.
// Months are the first day of the month as a YYYY-MM-01 string (no TZ drift).

export interface CategoryRow {
  id: number;
  name: string;
  color: string;
  sort_order: number;
}

export interface BudgetLine {
  category: string;
  color: string;
  /** Planned monthly budget for this category (0 when unset). */
  planned: number;
  /** Actual spend this month, summed from the expenses table. */
  spent: number;
}

export interface Totals {
  planned: number;
  spent: number;
  remaining: number;
}

const MONTH_RE = /^\d{4}-\d{2}-01$/;

/** True when `s` is a valid first-of-month ISO string (YYYY-MM-01). */
export function isMonthISO(s: string): boolean {
  return MONTH_RE.test(s);
}

/** First day of the month containing `d`, as YYYY-MM-01 (local). */
export function monthStartISO(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

/** First day of the month after `monthStart` (YYYY-MM-01 → YYYY-MM-01). */
export function nextMonthStartISO(monthStart: string): string {
  const [y, m] = monthStart.split("-").map(Number);
  const d = new Date(y, m, 1); // m is 1-based, so this lands on the next month
  return monthStartISO(d);
}

/** First day of the month before `monthStart` (YYYY-MM-01 → YYYY-MM-01). */
export function prevMonthStartISO(monthStart: string): string {
  const [y, m] = monthStart.split("-").map(Number);
  const d = new Date(y, m - 2, 1); // m is 1-based; m-2 is the previous month
  return monthStartISO(d);
}

/** "May 2026" style label for a YYYY-MM-01 month string. */
export function monthLabel(monthISO: string): string {
  const [y, m] = monthISO.split("-").map(Number);
  const d = new Date(y, (m || 1) - 1, 1);
  return d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

/** Currency formatter; whole dollars drop the cents. */
export function fmt(amount: number): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
    }).format(amount);
  } catch {
    return `$${amount.toFixed(2)}`;
  }
}

/**
 * Build one planned-vs-actual line per known category (in sort order), then
 * append any "orphan" categories that only appear in planned targets or in
 * expenses (e.g. a deleted category still tagging old rows).
 */
export function buildLines(
  categories: CategoryRow[],
  plannedByCat: Map<string, number>,
  spentByCat: Map<string, number>,
): BudgetLine[] {
  const colorOf = new Map(categories.map((c) => [c.name, c.color]));
  const seen = new Set<string>();
  const lines: BudgetLine[] = [];

  for (const c of categories) {
    seen.add(c.name);
    lines.push({
      category: c.name,
      color: c.color,
      planned: plannedByCat.get(c.name) || 0,
      spent: spentByCat.get(c.name) || 0,
    });
  }

  const orphans = new Set<string>();
  for (const k of plannedByCat.keys()) if (!seen.has(k)) orphans.add(k);
  for (const k of spentByCat.keys()) if (!seen.has(k)) orphans.add(k);
  for (const name of orphans) {
    lines.push({
      category: name,
      color: colorOf.get(name) || "#71717a",
      planned: plannedByCat.get(name) || 0,
      spent: spentByCat.get(name) || 0,
    });
  }
  return lines;
}

/** Sum amounts grouped by category into a Map. */
export function sumByCategory(
  rows: { category: string; amount: number | string }[],
): Map<string, number> {
  const m = new Map<string, number>();
  for (const r of rows) {
    const cat = r.category;
    m.set(cat, (m.get(cat) || 0) + (Number(r.amount) || 0));
  }
  return m;
}

/** Planned / spent / remaining across all lines. */
export function totalsOf(lines: BudgetLine[]): Totals {
  let planned = 0;
  let spent = 0;
  for (const l of lines) {
    planned += l.planned;
    spent += l.spent;
  }
  return { planned, spent, remaining: planned - spent };
}

/** A line is over budget when it has a plan and spend exceeds it. */
export function isOver(line: BudgetLine): boolean {
  return line.planned > 0 && line.spent > line.planned;
}

/**
 * Pace check (P3): compares how far through the month we are against how much of
 * the budget has been spent. Only meaningful for the *current* month, so the
 * caller passes whether `month` is the active one. Returns null when there's no
 * plan, the month isn't current, or the day fraction is unknown.
 */
export interface Pace {
  /** 0..1 — fraction of the month elapsed. */
  monthFraction: number;
  /** 0..1+ — fraction of the budget spent (can exceed 1 when over). */
  spendFraction: number;
  /** spendFraction is meaningfully ahead of monthFraction. */
  aheadOfPace: boolean;
}

export function pace(
  totals: Totals,
  isCurrentMonth: boolean,
  now: Date = new Date(),
): Pace | null {
  if (!isCurrentMonth || totals.planned <= 0) return null;
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const monthFraction = Math.min(now.getDate() / daysInMonth, 1);
  const spendFraction = totals.spent / totals.planned;
  // "Ahead of pace" = spending faster than time is passing, with a small buffer
  // so being a percent or two ahead doesn't trip the warning.
  const aheadOfPace = spendFraction > monthFraction + 0.05;
  return { monthFraction, spendFraction, aheadOfPace };
}
