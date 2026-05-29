// Timezone-correct calendar-day helpers for the XP layer. Day boundaries must be
// the *user's* local day (the per-app views bucket locally on the client); these
// let the server agree. Pure + DST-safe via Intl.

const FMT = new Map<string, Intl.DateTimeFormat>();

function formatter(tz: string): Intl.DateTimeFormat {
  let f = FMT.get(tz);
  if (!f) {
    // en-CA formats as YYYY-MM-DD.
    f = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" });
    FMT.set(tz, f);
  }
  return f;
}

const pad = (n: number) => String(n).padStart(2, "0");

/** A UTC instant → the user's local calendar day (YYYY-MM-DD) in `tz`. DST-safe. */
export function localDayKey(instant: Date | string, tz: string): string {
  const d = typeof instant === "string" ? new Date(instant) : instant;
  try {
    return formatter(tz).format(d);
  } catch {
    // Invalid zone — fall back to UTC calendar date.
    return d.toISOString().slice(0, 10);
  }
}

/** The user's "today" (YYYY-MM-DD) in `tz`. */
export function todayKey(tz: string, now: Date = new Date()): string {
  return localDayKey(now, tz);
}

const HOUR_FMT = new Map<string, Intl.DateTimeFormat>();

function hourFormatter(tz: string): Intl.DateTimeFormat {
  let f = HOUR_FMT.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", hourCycle: "h23" });
    HOUR_FMT.set(tz, f);
  }
  return f;
}

/** A UTC instant → the user's local hour-of-day (0–23) in `tz`, or null if invalid. DST-safe. */
export function localHour(instant: Date | string, tz: string): number | null {
  const d = typeof instant === "string" ? new Date(instant) : instant;
  if (Number.isNaN(d.getTime())) return null;
  try {
    const h = Number(hourFormatter(tz).format(d));
    return Number.isFinite(h) ? h % 24 : null;
  } catch {
    return d.getUTCHours();
  }
}

/** Step a YYYY-MM-DD day by ±n days on the calendar (operate at UTC noon to dodge DST edges). */
export function addDays(dayKey: string, n: number): string {
  const [y, m, d] = dayKey.split("-").map(Number);
  const ms = Date.UTC(y, (m || 1) - 1, d || 1, 12) + n * 86_400_000;
  const dt = new Date(ms);
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
}

/** Weekday-narrow label (e.g. "M") for a YYYY-MM-DD calendar day. */
export function weekdayNarrow(dayKey: string): string {
  const [y, m, d] = dayKey.split("-").map(Number);
  return new Date(Date.UTC(y, (m || 1) - 1, d || 1, 12)).toLocaleDateString(undefined, {
    weekday: "narrow",
    timeZone: "UTC",
  });
}

/** True for a real IANA zone; used to validate client-supplied values. */
export function isValidIanaZone(tz: string): boolean {
  if (!tz || typeof tz !== "string") return false;
  try {
    new Intl.DateTimeFormat("en-CA", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}
