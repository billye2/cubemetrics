// Streak math over the set of days the user earned XP. Pure + testable.
// Works on YYYY-MM-DD calendar-day strings so it's timezone-neutral — the caller
// supplies the user's local "today" (see tz.ts).

import { addDays } from "./tz";

/** Local YYYY-MM-DD for a Date in the *server* zone. Kept for convenience/tests. */
export function dayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Consecutive-day streak ending at `todayKey`, with a one-day grace: if today has
 * no XP yet, the streak is measured from yesterday so an in-progress day doesn't
 * read as broken. Matches the Focus/Habits streak behavior.
 */
export function currentStreak(daysWithXp: Iterable<string>, todayKey: string): number {
  const set = daysWithXp instanceof Set ? daysWithXp : new Set(daysWithXp);
  let cursor = todayKey;
  if (!set.has(cursor)) {
    cursor = addDays(cursor, -1);
    if (!set.has(cursor)) return 0;
  }
  let streak = 0;
  while (set.has(cursor)) {
    streak++;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

/** Longest run of consecutive days present in the set, over all history. */
export function longestStreak(daysWithXp: Iterable<string>): number {
  const keys = [...new Set(daysWithXp)].sort();
  let best = 0;
  let run = 0;
  let prev: number | null = null;
  for (const k of keys) {
    const [y, m, d] = k.split("-").map(Number);
    const ms = Date.UTC(y, (m || 1) - 1, d || 1, 12); // noon avoids DST off-by-one
    if (prev !== null) {
      const gap = Math.round((ms - prev) / 86_400_000);
      run = gap === 1 ? run + 1 : 1;
    } else {
      run = 1;
    }
    if (run > best) best = run;
    prev = ms;
  }
  return best;
}
