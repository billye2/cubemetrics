import type { NotifyPrefs, Kind } from "./types";

// Window must be >= the cron interval (30 min) so no local send-time is ever missed.
const WINDOW_MIN = 30;

/** True when nowMin falls in [t, t+windowMin) for the given "HH:MM" / "HH:MM:SS" time. */
export function within(nowMin: number, hhmm: string, windowMin: number): boolean {
  const [h, m] = hhmm.split(":");
  const t = Number(h) * 60 + Number(m);
  return nowMin >= t && nowMin < t + windowMin;
}

/** Which digests are due *now* for this user and not yet sent today. Pure. */
export function isDue(
  prefs: NotifyPrefs,
  localHour: number,
  localMinute: number,
  sentToday: Set<Kind>,
): Kind[] {
  const nowMin = localHour * 60 + localMinute;
  const due: Kind[] = [];
  if (
    prefs.morning_enabled &&
    !sentToday.has("morning") &&
    within(nowMin, prefs.morning_time, WINDOW_MIN)
  ) {
    due.push("morning");
  }
  if (
    prefs.evening_enabled &&
    !sentToday.has("evening") &&
    within(nowMin, prefs.evening_time, WINDOW_MIN)
  ) {
    due.push("evening");
  }
  return due;
}
