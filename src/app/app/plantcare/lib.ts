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
  created_at: string;
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
