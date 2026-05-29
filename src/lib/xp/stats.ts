// Streak math over the set of days the user earned XP. Pure + testable.

export function dayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Consecutive-day streak ending today, with a one-day grace: if today has no
 * XP yet, the streak is measured from yesterday so an in-progress day doesn't
 * read as broken. Matches the Focus/Habits streak behavior.
 */
export function currentStreak(daysWithXp: Iterable<string>, now: Date = new Date()): number {
  const set = daysWithXp instanceof Set ? daysWithXp : new Set(daysWithXp);
  const cursor = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (!set.has(dayKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
    if (!set.has(dayKey(cursor))) return 0;
  }
  let streak = 0;
  while (set.has(dayKey(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

/** Longest run of consecutive days present in the set, over all history. */
export function longestStreak(daysWithXp: Iterable<string>): number {
  const keys = [...new Set(daysWithXp)].sort();
  let best = 0;
  let run = 0;
  let prev: Date | null = null;
  for (const k of keys) {
    const d = new Date(k + "T00:00:00");
    if (prev) {
      const gap = Math.round((d.getTime() - prev.getTime()) / 86_400_000);
      run = gap === 1 ? run + 1 : 1;
    } else {
      run = 1;
    }
    if (run > best) best = run;
    prev = d;
  }
  return best;
}
