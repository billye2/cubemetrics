// Calendar event model + read-time recurrence expansion.
// Recurring events are stored as a single row with a `recurrence` cadence; the
// individual occurrences are derived on read across the visible window so we
// never persist (or have to clean up) materialized instances.

export type Recurrence = "daily" | "weekly" | "monthly";

const VALID_RECURRENCE = new Set<string>(["daily", "weekly", "monthly"]);

/** Normalize a raw form/db value to a supported cadence, or null. */
export function normalizeRecurrence(value: string | null | undefined): Recurrence | null {
  return value && VALID_RECURRENCE.has(value) ? (value as Recurrence) : null;
}

export const RECURRENCE_LABEL: Record<Recurrence, string> = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
};

export interface Event {
  id: number;
  title: string;
  description: string | null;
  start_date: string;
  start_time: string | null;
  end_date: string | null;
  end_time: string | null;
  recurrence: string | null;
}

/**
 * A single rendered instance of an event. For recurring series `start_date` /
 * `end_date` are shifted onto the occurrence; `seriesStart` / `seriesEnd` keep
 * the stored anchor so the edit form drives the whole series rather than
 * silently re-anchoring it to one occurrence.
 */
export interface Occurrence extends Event {
  occKey: string;
  repeats: boolean;
  seriesStart: string;
  seriesEnd: string | null;
}

function dateFromYmd(s: string): Date {
  return new Date(s + "T00:00:00");
}

function ymdFromDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function addDays(s: string, n: number): string {
  const d = dateFromYmd(s);
  d.setDate(d.getDate() + n);
  return ymdFromDate(d);
}

/** Add `n` calendar months, clamping the day to the target month's length. */
export function addMonths(s: string, n: number): string {
  const d = dateFromYmd(s);
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + n);
  const daysInMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, daysInMonth));
  return ymdFromDate(d);
}

function daysBetween(a: string, b: string): number {
  return Math.round((dateFromYmd(b).getTime() - dateFromYmd(a).getTime()) / 86_400_000);
}

function makeOccurrence(base: Event, startDate: string, durationDays: number, repeats: boolean): Occurrence {
  return {
    ...base,
    start_date: startDate,
    end_date: durationDays > 0 ? addDays(startDate, durationDays) : null,
    occKey: `${base.id}:${startDate}`,
    repeats,
    seriesStart: base.start_date,
    seriesEnd: base.end_date,
  };
}

/**
 * Expand events into the occurrences that fall within [windowStart, windowEnd]
 * (inclusive `YYYY-MM-DD` bounds). Non-recurring events pass through once if
 * they overlap the window; recurring events are stepped by their cadence. A
 * multi-day occurrence keeps the same span as its anchor.
 */
export function expandEvents(events: Event[], windowStart: string, windowEnd: string): Occurrence[] {
  const out: Occurrence[] = [];

  for (const e of events) {
    const cadence = normalizeRecurrence(e.recurrence);
    const durationDays = e.end_date && e.end_date > e.start_date ? daysBetween(e.start_date, e.end_date) : 0;

    if (!cadence) {
      const spanEnd = durationDays > 0 ? e.end_date! : e.start_date;
      if (e.start_date <= windowEnd && spanEnd >= windowStart) {
        out.push(makeOccurrence(e, e.start_date, durationDays, false));
      }
      continue;
    }

    // Each occurrence is the anchor advanced by its index k — computing from the
    // anchor (not the previous occurrence) avoids monthly day-of-month drift
    // (Jan 31 → Feb 28 → Mar 31, not → Mar 28).
    const anchor = e.start_date;
    const stepFrom = (k: number): string =>
      cadence === "daily" ? addDays(anchor, k) : cadence === "weekly" ? addDays(anchor, k * 7) : addMonths(anchor, k);

    // First index whose span can still touch the window. A multi-day span
    // starting `durationDays` before the window can still overlap it.
    const minStart = durationDays > 0 ? addDays(windowStart, -durationDays) : windowStart;
    let k = 0;
    if (anchor < minStart) {
      if (cadence === "daily") k = daysBetween(anchor, minStart);
      else if (cadence === "weekly") k = Math.ceil(daysBetween(anchor, minStart) / 7);
      else {
        let guard = 0;
        while (stepFrom(k) < minStart && guard < 1200) {
          k++;
          guard++;
        }
      }
    }

    let guard = 0;
    let occ = stepFrom(k);
    while (occ <= windowEnd && guard < 1000) {
      out.push(makeOccurrence(e, occ, durationDays, true));
      k++;
      guard++;
      occ = stepFrom(k);
    }
  }

  return out;
}
