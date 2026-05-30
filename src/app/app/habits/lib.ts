/**
 * Pure date + heatmap helpers for the Habits app. No DB / React imports here so
 * the logic stays unit-testable. All dates are ISO `YYYY-MM-DD` strings in the
 * user's locale-naive sense (we treat the stored `checkin_date` as a plain day).
 */

/** Today as an ISO `YYYY-MM-DD` string. */
export function todayISO(now: Date = new Date()): string {
  return toISO(now);
}

/** Format a Date as `YYYY-MM-DD` (local, no timezone shift). */
export function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** ISO string for the day `n` days before `from` (n may be negative). */
export function isoDaysAgo(n: number, from: Date = new Date()): string {
  const d = new Date(from);
  d.setDate(d.getDate() - n);
  return toISO(d);
}

/**
 * Consecutive-day streak ending today (or yesterday if today isn't checked yet,
 * so a pending today doesn't reset the streak). `dates` is the set of checked
 * ISO days.
 */
export function computeStreak(dates: Set<string>, now: Date = new Date()): number {
  const checkedToday = dates.has(toISO(now));
  let streak = 0;
  const d = new Date(now);
  if (!checkedToday) d.setDate(d.getDate() - 1);
  while (dates.has(toISO(d))) {
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

/** Count of checked days within the trailing 7-day window ending today. */
export function weekCount(dates: Set<string>, now: Date = new Date()): number {
  const today = toISO(now);
  const weekAgo = isoDaysAgo(6, now);
  let count = 0;
  for (const dateStr of dates) {
    if (dateStr >= weekAgo && dateStr <= today) count++;
  }
  return count;
}

export interface HeatCell {
  date: string;
  checked: boolean;
  /** True for filler cells before the first real day (keeps the grid square). */
  filler: boolean;
}

/**
 * Build a GitHub-style heatmap grid for the trailing `weeks` weeks ending on the
 * week that contains `now`. Returns columns of 7 cells (Sun..Sat), oldest column
 * first. Days after `now` in the final week — and days before the window in the
 * first week — are emitted as `filler` cells so every column has 7 entries.
 */
export function buildHeatmap(
  dates: Set<string>,
  weeks = 8,
  now: Date = new Date(),
): HeatCell[][] {
  const today = toISO(now);

  // End of the current week (Saturday) so the grid's last column is the live week.
  const end = new Date(now);
  end.setDate(end.getDate() + (6 - end.getDay()));

  // Start: go back `weeks - 1` full weeks then to that week's Sunday.
  const start = new Date(end);
  start.setDate(start.getDate() - (weeks * 7 - 1));

  const columns: HeatCell[][] = [];
  const cursor = new Date(start);
  for (let w = 0; w < weeks; w++) {
    const col: HeatCell[] = [];
    for (let dow = 0; dow < 7; dow++) {
      const iso = toISO(cursor);
      const future = iso > today;
      col.push({
        date: iso,
        checked: dates.has(iso),
        filler: future,
      });
      cursor.setDate(cursor.getDate() + 1);
    }
    columns.push(col);
  }
  return columns;
}

/** Completion-rate % over the trailing `days` window (P2 helper, also tested). */
export function completionRate(
  dates: Set<string>,
  days: number,
  now: Date = new Date(),
): number {
  const today = toISO(now);
  const start = isoDaysAgo(days - 1, now);
  let hit = 0;
  for (const dateStr of dates) {
    if (dateStr >= start && dateStr <= today) hit++;
  }
  return Math.round((hit / days) * 100);
}
