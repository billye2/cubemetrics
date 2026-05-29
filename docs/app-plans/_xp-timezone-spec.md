# Spec — Timezone-correct day boundaries for the XP layer

Fixes the open issue from `_xp-layer-spec.md` §9 and `_xp-quests-spec.md` §6: the XP layer buckets
days with the **server's** local day, not the **user's**. The `profiles.timezone` column exists
(migration `020`) but nothing reads it.

## The bug, concretely

In `compute.ts`/`stats.ts`:
- `dayKey(d)` uses `d.getFullYear()/getMonth()/getDate()` — the server process's zone. On Vercel
  that's **UTC**.
- `ensureXp(..., now = new Date())` derives "today" from server `now`, and buckets each source row
  via `toDay(value).slice(0,10)`.

For **`TIMESTAMPTZ`** source columns, `.slice(0,10)` takes the **UTC** date. A user in
`America/Los_Angeles` who completes a todo at 6pm PST (= 02:00 UTC next day) gets it counted on the
*wrong* day — inflating one day, breaking a streak, mis-scoring a quest. `DATE` columns are
unaffected by tz conversion (they're already calendar dates), but only if the writing action stored
the user's local date (see §6).

Per-app views are already correct — `trackerLib.localDateKey` computes the local day on the
**client**. The fix makes server-side XP agree with that notion of "day."

## 1. Capture the user's timezone → `profiles.timezone`

The browser is the only place that knows the zone. Add a tiny client sync, mounted once where every
logged-in user lands (the home page, or `Shell`):

```tsx
// src/components/modern/TimezoneSync.tsx  (client)
// On mount, read Intl tz; if it differs from the known value, persist it once.
useEffect(() => {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone; // e.g. "America/Los_Angeles"
  if (tz && tz !== knownTz) setTimezoneAction(tz);             // fire-and-forget
}, []);
```

```ts
// server action
export async function setTimezoneAction(tz: string) {
  if (!isValidIanaZone(tz)) return;            // validate (see below) — never trust the client
  const { supabase, userId } = await requireUser();
  await supabase.from("profiles").update({ timezone: tz }).eq("id", userId);
}
```

- **Validate** with `Intl.supportedValuesOf("timeZone").includes(tz)` (fast set check) or a
  conservative `^[A-Za-z]+/[A-Za-z0-9_+\-/]+$` regex fallback. Reject anything else.
- Pass the known value into the component (from the profile) so it only writes on change — no write
  every render. No new migration; the column already exists.

## 2. Timezone-aware day helpers — `src/lib/xp/tz.ts`

```ts
/** One cached Intl formatter per zone (formatter construction isn't free). */
const FMT = new Map<string, Intl.DateTimeFormat>();
function formatter(tz: string): Intl.DateTimeFormat { /* en-CA → YYYY-MM-DD; cache by tz */ }

/** A UTC instant → the user's local calendar day (YYYY-MM-DD) in `tz`. DST-safe. */
export function localDayKey(instant: Date | string, tz: string): string;

/** The user's "today" in `tz`. */
export function todayKey(tz: string, now: Date = new Date()): string;

/** Step a YYYY-MM-DD calendar day by ±n days, tz-neutrally (operate at UTC noon). */
export function addDays(dayKey: string, n: number): string;

/** True for a real IANA zone; used by setTimezoneAction. */
export function isValidIanaZone(tz: string): boolean;
```

- `localDayKey` uses `Intl.DateTimeFormat("en-CA", { timeZone: tz, year/month/day: "..." })` →
  already `YYYY-MM-DD`. Dependency-free, handles DST because it formats the *instant* in the zone.
- `addDays` parses to `Date.UTC(y, m-1, d, 12)` (noon avoids DST edges), shifts, reformats — purely
  on the calendar triplet, so no zone re-enters.

## 3. Make streaks tz-aware — `stats.ts`

The streak math is calendar-day arithmetic; it just needs to start from the user's today and step
days without reintroducing the server zone:

```ts
export function currentStreak(daysWithXp: Set<string>, todayKey: string): number; // was (…, now: Date)
export function longestStreak(daysWithXp: Iterable<string>): number;              // unchanged
```

- `currentStreak` walks back from `todayKey` via `addDays(cursor, -1)` (string calendar dates),
  keeping the existing one-day grace.
- `longestStreak` already works on `YYYY-MM-DD` strings; switch its internal `+ "T00:00:00"` parse
  to the same UTC-noon parse to avoid a DST off-by-one at run boundaries.

## 4. Thread tz through `compute.ts`

1. **Resolve the zone** at the top of `ensureXp`:
   `tz = (await supabase.from("profiles").select("timezone").eq("id", userId).single()).data?.timezone || "UTC"`.
   (Or accept an optional `tz` param for tests / to let the RSC pass it.)
2. **Today:** `const todayKeyStr = todayKey(tz, now)` — replaces `dayKey(now)`.
3. **Bucket each source by column kind.** A row's day is:
   - **`TIMESTAMPTZ` columns → `localDayKey(value, tz)`**
   - **`DATE` columns → `value.slice(0,10)`** (already a calendar date; no conversion)

   | Source | Column | Kind | Day = |
   |--------|--------|------|-------|
   | daily_trackers | `entry_date` ?? `created_at` | DATE / TZ | entry_date as-is, else `localDayKey(created_at)` |
   | pomodoro_sessions | `completed_at` | TZ | `localDayKey` |
   | todos | `completed_at` | TZ | `localDayKey` |
   | habit_checkins | `checkin_date` | DATE | as-is |
   | journal_entries | `entry_date` | DATE | as-is |
   | workout_sessions | `performed_on` | DATE | as-is |
   | reading_list | `finished_at` | TZ | `localDayKey` |
   | notes | `created_at` | TZ | `localDayKey` |
   | logs | `created_at` | TZ | `localDayKey` |
   | expenses | `expense_date` | DATE | as-is |
   | finance_items | `created_at` | TZ | `localDayKey` |

   Implement as a small `bucketDay(value, kind, tz)` and tag each source `"date" | "ts"`.
4. **Streak call:** `currentStreak(daysWithXp, todayKeyStr)`.
5. **Quests** (when built) inherit this automatically — they key off the same `todayKeyStr` and
   `addDays`, and `pickDailyQuests(userId, todayKeyStr)` becomes correct for free.

## 5. Performance

- One `profiles.timezone` read per `ensureXp` (cheap; can be folded into an existing profile fetch
  on the page if one exists).
- One cached `Intl.DateTimeFormat` per zone via the `FMT` map — reused across all rows in the
  request. Don't construct per row.

## 6. Known follow-on (flag, don't fix here)

`DATE` columns are only correct if the **writing** action stored the user's *local* date. Some
default to `CURRENT_DATE` (= server/UTC date). For full correctness, app write-actions that set a
`*_date` should compute the user's local date (client-supplied or from `profiles.timezone`) rather
than `CURRENT_DATE`. That's a broader cleanup across the per-app `actions.ts`; out of scope for the
XP fix, but it's the reason a late-night habit check-in could still land a day off until addressed.

## 7. Tests (Vitest)

- `localDayKey("2026-01-01T06:00:00Z", "America/Los_Angeles") === "2025-12-31"`; same instant in
  `Asia/Tokyo` → `"2026-01-01"`; `UTC` → `"2026-01-01"`.
- `todayKey` matches `localDayKey(now, tz)`.
- `addDays` across month/year boundaries and across a DST transition (e.g. US spring-forward) stays
  on calendar days (no 23/25-hour drift).
- `currentStreak` from a given `todayKey` with the one-day grace; `longestStreak` unaffected by DST.
- `isValidIanaZone` accepts real zones, rejects junk.
- Fallback: null/invalid `profiles.timezone` → UTC, no throw.

## 8. Rollout

1. `tz.ts` helpers + tests (pure).
2. `stats.ts` signature change (`currentStreak(days, todayKey)`).
3. `compute.ts`: resolve tz, per-column bucketing, today/streak wiring.
4. `TimezoneSync` component + `setTimezoneAction` (capture path).
5. (Later) the §6 per-app `*_date` write cleanup for end-to-end correctness.
