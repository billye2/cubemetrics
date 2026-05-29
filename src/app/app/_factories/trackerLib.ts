import type { FactoryConfig } from "@/lib/modern/catalog";

export interface TrackerEntry {
  id: number;
  value: number | string;
  note: string | null;
  created_at: string;
}

export type AggregateMode = "sum" | "latest" | "average";

export interface DailyBucket {
  key: string;
  short: string;
  label: string;
  value: number;
  count: number;
  isToday: boolean;
}

const NUMERIC_FORMATTER_CACHE = new Map<number, Intl.NumberFormat>();

function fmt(value: number, fractionDigits: number): string {
  let f = NUMERIC_FORMATTER_CACHE.get(fractionDigits);
  if (!f) {
    f = new Intl.NumberFormat(undefined, {
      maximumFractionDigits: fractionDigits,
      minimumFractionDigits: 0,
    });
    NUMERIC_FORMATTER_CACHE.set(fractionDigits, f);
  }
  return f.format(value);
}

export function localDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function entryDateKey(e: TrackerEntry): string {
  return localDateKey(new Date(e.created_at));
}

/**
 * Folds entries on a single day into a single number per the aggregation mode.
 * Empty input yields null so callers can distinguish "no data" from a real zero.
 */
export function aggregateDay(entries: TrackerEntry[], mode: AggregateMode): number | null {
  if (entries.length === 0) return null;
  const nums = entries.map((e) => Number(e.value) || 0);
  if (mode === "sum") return nums.reduce((acc, n) => acc + n, 0);
  if (mode === "average") return nums.reduce((acc, n) => acc + n, 0) / nums.length;
  return Number(entries[0].value) || 0;
}

/**
 * Builds a `days`-long array of daily buckets ending today, applying `mode`
 * within each day. Entries are matched to days using local time so users see
 * the day they actually logged in.
 */
export function bucketByDay(
  entries: TrackerEntry[],
  days: number,
  mode: AggregateMode,
  now: Date = new Date(),
): DailyBucket[] {
  const grouped = new Map<string, TrackerEntry[]>();
  for (const e of entries) {
    const k = entryDateKey(e);
    const arr = grouped.get(k) ?? [];
    arr.push(e);
    grouped.set(k, arr);
  }
  const todayKey = localDateKey(now);
  const out: DailyBucket[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = localDateKey(d);
    const dayEntries = grouped.get(key) ?? [];
    const sortedAsc = [...dayEntries].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );
    const latestFirst = [...sortedAsc].reverse();
    const value = aggregateDay(latestFirst, mode) ?? 0;
    out.push({
      key,
      short: d.toLocaleDateString(undefined, { weekday: "narrow" }),
      label: d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }),
      value,
      count: dayEntries.length,
      isToday: key === todayKey,
    });
  }
  return out;
}

export function todayAggregate(
  entries: TrackerEntry[],
  mode: AggregateMode,
  now: Date = new Date(),
): number | null {
  const todayKey = localDateKey(now);
  const todays = entries.filter((e) => entryDateKey(e) === todayKey);
  const latestFirst = [...todays].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
  return aggregateDay(latestFirst, mode);
}

export function averageOver(buckets: DailyBucket[]): number | null {
  const withData = buckets.filter((b) => b.count > 0);
  if (withData.length === 0) return null;
  return withData.reduce((acc, b) => acc + b.value, 0) / withData.length;
}

export function bestDay(buckets: DailyBucket[]): DailyBucket | null {
  const withData = buckets.filter((b) => b.count > 0);
  if (withData.length === 0) return null;
  return withData.reduce((best, b) => (b.value > best.value ? b : best), withData[0]);
}

export function computeStreak(entries: TrackerEntry[], now: Date = new Date()): number {
  if (entries.length === 0) return 0;
  const days = new Set(entries.map(entryDateKey));
  const cursor = new Date(now);
  if (!days.has(localDateKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
    if (!days.has(localDateKey(cursor))) return 0;
  }
  let streak = 0;
  while (days.has(localDateKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

/**
 * Renders a numeric tracker value for display. Scale trackers (config.labels)
 * round to the nearest label; numeric trackers use 0 or 1 fraction digits
 * depending on whether averaging is in play.
 */
export function formatValue(value: number, config: FactoryConfig, mode: AggregateMode): string {
  if (config.labels) {
    const i = Math.round(value);
    return config.labels[Math.max(0, Math.min(config.labels.length - 1, i))] ?? String(i);
  }
  const fractionDigits = mode === "average" ? 1 : Number.isInteger(value) ? 0 : 1;
  return fmt(value, fractionDigits);
}
