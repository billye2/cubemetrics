// Pure, testable plant-watering math. Watering is a recurrence:
// next-due = last_watered + frequency_days. We never store next-due — we
// compute it relative to "today" so the status badge is always current.
// A plant that has never been watered (last_watered = null) is due now.

export type PlantStatus = "overdue" | "today" | "upcoming";
export type LightLevel = "low" | "medium" | "bright";

export interface PlantRow {
  id: number;
  name: string;
  frequency_days: number;
  last_watered: string | null; // YYYY-MM-DD or null (never watered)
  light: string | null;
  note: string | null;
  photo_url: string | null;
  fertilize_days: number | null; // null = fertilizing track off (P3)
  last_fertilized: string | null; // YYYY-MM-DD or null (P3)
  created_at: string;
}

/** Second recurrence track: fertilizing. Mirrors the watering computation. */
export interface FertilizeTrack {
  enabled: boolean;
  frequencyDays: number | null;
  lastFertilized: string | null;
  nextDue: string | null;
  daysUntil: number | null; // null when track is off or never fertilized
  status: PlantStatus | null; // null when track is off
  label: string | null; // e.g. "fertilize today", "in 2 weeks", "off"
}

export interface Plant {
  id: number;
  name: string;
  frequencyDays: number;
  lastWatered: string | null;
  light: LightLevel | null;
  note: string | null;
  photoUrl: string | null;
  nextDue: string | null; // YYYY-MM-DD; null only when never watered
  daysUntil: number; // negative once overdue; 0 = today; large when never watered
  status: PlantStatus;
  label: string; // adaptive, e.g. "in 3 days", "due today", "5 days overdue", "never watered"
  fertilize: FertilizeTrack; // P3 second recurrence track
}

function parseDate(d: string): Date {
  const [y, m, day] = d.split("-").map(Number);
  return new Date(y, m - 1, day);
}

function fmtDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function dayDiff(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / 86_400_000);
}

/** last_watered + frequency_days. */
export function computeNextDue(lastWatered: string, frequencyDays: number): Date {
  const base = parseDate(lastWatered);
  base.setDate(base.getDate() + frequencyDays);
  return base;
}

export function statusFor(daysUntil: number): PlantStatus {
  if (daysUntil < 0) return "overdue";
  if (daysUntil === 0) return "today";
  return "upcoming";
}

/** Adaptive remaining-time text. Positive = days until due, 0 = today, negative = overdue. */
export function formatDue(daysUntil: number, neverWatered: boolean): string {
  if (neverWatered) return "never watered";
  if (daysUntil < 0) {
    const ago = -daysUntil;
    return ago === 1 ? "1 day overdue" : `${ago} days overdue`;
  }
  if (daysUntil === 0) return "due today";
  if (daysUntil === 1) return "tomorrow";
  if (daysUntil >= 14) {
    const w = Math.round(daysUntil / 7);
    return `in ${w} weeks`;
  }
  return `in ${daysUntil} days`;
}

function cleanLight(light: string | null): LightLevel | null {
  return light === "low" || light === "medium" || light === "bright" ? light : null;
}

const RANK: Record<PlantStatus, number> = { overdue: 0, today: 1, upcoming: 2 };

/** Adaptive remaining-time text for the fertilizing track. */
export function formatFertilizeDue(daysUntil: number, neverFertilized: boolean): string {
  if (neverFertilized) return "feed now";
  if (daysUntil < 0) {
    const ago = -daysUntil;
    return ago === 1 ? "feed (1 day late)" : `feed (${ago} days late)`;
  }
  if (daysUntil === 0) return "feed today";
  if (daysUntil === 1) return "feed tomorrow";
  if (daysUntil >= 14) {
    const w = Math.round(daysUntil / 7);
    return `feed in ${w} weeks`;
  }
  return `feed in ${daysUntil} days`;
}

/** Build the fertilizing recurrence track. `today` is injectable for tests. */
export function toFertilizeTrack(row: PlantRow, today: Date): FertilizeTrack {
  const freq = row.fertilize_days;
  if (!freq || freq <= 0) {
    return {
      enabled: false,
      frequencyDays: null,
      lastFertilized: null,
      nextDue: null,
      daysUntil: null,
      status: null,
      label: null,
    };
  }
  const t = new Date(today);
  t.setHours(0, 0, 0, 0);
  const neverFertilized = !row.last_fertilized;

  let nextDue: string | null = null;
  let daysUntil: number;
  if (neverFertilized) {
    daysUntil = -1; // never fed → due now
  } else {
    const due = computeNextDue(row.last_fertilized as string, freq);
    nextDue = fmtDate(due);
    daysUntil = dayDiff(t, due);
  }
  return {
    enabled: true,
    frequencyDays: freq,
    lastFertilized: row.last_fertilized,
    nextDue,
    daysUntil,
    status: statusFor(daysUntil),
    label: formatFertilizeDue(daysUntil, neverFertilized),
  };
}

/** Map a DB row to the enriched view model. `today` is injectable for tests. */
export function toPlant(row: PlantRow, today: Date): Plant {
  const t = new Date(today);
  t.setHours(0, 0, 0, 0);
  const neverWatered = !row.last_watered;

  let nextDue: string | null = null;
  let daysUntil: number;
  if (neverWatered) {
    // Never watered → treat as due now (overdue), sorted to the very top.
    daysUntil = -1;
  } else {
    const due = computeNextDue(row.last_watered as string, row.frequency_days);
    nextDue = fmtDate(due);
    daysUntil = dayDiff(t, due);
  }

  const status = statusFor(daysUntil);
  return {
    id: row.id,
    name: row.name,
    frequencyDays: row.frequency_days,
    lastWatered: row.last_watered,
    light: cleanLight(row.light),
    note: row.note,
    photoUrl: row.photo_url,
    nextDue,
    daysUntil,
    status,
    label: formatDue(daysUntil, neverWatered),
    fertilize: toFertilizeTrack(row, today),
  };
}

/** Sort: overdue first, then due today, then upcoming, each by soonest. */
export function sortPlants(list: Plant[]): Plant[] {
  return [...list].sort((a, b) => {
    if (RANK[a.status] !== RANK[b.status]) return RANK[a.status] - RANK[b.status];
    if (a.daysUntil !== b.daysUntil) return a.daysUntil - b.daysUntil;
    return a.name.localeCompare(b.name);
  });
}

export interface PlantStats {
  total: number;
  dueToday: number; // due today OR overdue — i.e. needs water now
  overdue: number;
}

export function statsFor(list: Plant[]): PlantStats {
  return {
    total: list.length,
    dueToday: list.filter((p) => p.status === "today" || p.status === "overdue").length,
    overdue: list.filter((p) => p.status === "overdue").length,
  };
}

/** Plants that need water right now (overdue or due today). */
export function needsWaterToday(list: Plant[]): Plant[] {
  return list.filter((p) => p.status === "overdue" || p.status === "today");
}

// --- P3: watering-history sparkline ---------------------------------------

export interface SparkBar {
  /** Days since the previous watering (the interval this bar represents). */
  gap: number;
  /** 0..1 height for rendering, scaled against the longest gap in the window. */
  height: number;
  /** True when this gap exceeds the target frequency (a "late" watering). */
  late: boolean;
}

/**
 * Turn a list of watering dates into sparkline bars showing the *intervals*
 * between consecutive waterings. A run of even bars means a steady rhythm;
 * a tall bar flags a long dry spell. `dates` may arrive in any order.
 * `frequencyDays` marks the target so we can flag late waterings.
 */
export function waterIntervals(
  dates: string[],
  frequencyDays: number,
  maxBars = 12,
): SparkBar[] {
  const sorted = [...new Set(dates)]
    .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d))
    .sort();
  if (sorted.length < 2) return [];

  const gaps: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    gaps.push(dayDiff(parseDate(sorted[i - 1]), parseDate(sorted[i])));
  }
  const recent = gaps.slice(-maxBars);
  const max = Math.max(...recent, 1);
  return recent.map((gap) => ({
    gap,
    height: Math.max(0.12, gap / max),
    late: frequencyDays > 0 && gap > frequencyDays,
  }));
}

/** Average watering interval (days) across the history, or null if too short. */
export function averageInterval(dates: string[]): number | null {
  const sorted = [...new Set(dates)]
    .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d))
    .sort();
  if (sorted.length < 2) return null;
  const first = parseDate(sorted[0]);
  const last = parseDate(sorted[sorted.length - 1]);
  return Math.round(dayDiff(first, last) / (sorted.length - 1));
}
