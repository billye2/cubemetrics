# Reference adapter — `medication`

A complete, drop-in reference for writing a Spine adapter, using `medication` (the `schedule_items`
"due/recurring" pattern). It mirrors the shipped `bills` adapter's structure: a **thin adapter** that
queries, and a **pure builder** in `lib.ts` that does the branchy logic (so it's unit-tested without a
DB). Clone this shape for the other zero-migration candidates in
[adapter-candidates.md](adapter-candidates.md).

> Status: **reference / not yet shipped.** Dropping these three pieces in (+ `npm run build:spine`)
> makes a medication card appear on `/today`. The query is RLS-safe and read-only.

## How "due" is computed (matches the app's own `ScheduleView`)
`schedule_items` stores `last_done` + `interval_days`. The app computes `next_due = last_done +
interval_days`; a row with `last_done = null` is **due now** ("never done"). The adapter reproduces
exactly that, then maps `next_due` vs. the user's local `today` onto the spine's statuses via the
existing `bucketStatus` helper:

| next_due vs today | TodayStatus | Today grouping |
|-------------------|-------------|----------------|
| `null` (never done) | `due` | Needs attention |
| before today | `overdue` | Needs attention |
| today | `due` | Needs attention |
| within the 7-day horizon | `upcoming` | Upcoming |
| beyond the horizon | *(filtered out — not surfaced)* | — |

## 1. Pure builder — add to `src/lib/spine/lib.ts`
Generic over any `schedule_items`-backed app — currently `medication` and `carcare` (the only two
apps with `ui: "schedule"`) — so the same helper serves both adapters.

```ts
import { addDays } from "@/lib/xp/tz"; // add to the existing imports at the top of lib.ts

/**
 * Schedule/recurring builder (schedule_items): next_due = last_done + interval_days;
 * a never-done item (last_done = null) is due now. Surfaces items due/overdue or within
 * the `soon` horizon; far-future items are dropped. Pure — unit-tested without a DB.
 */
export function scheduleToday(
  appId: string,
  rows: { id: number; title: string; interval_days: number; last_done: string | null }[],
  today: string, // YYYY-MM-DD (user-local)
  soon: string,  // YYYY-MM-DD horizon, e.g. addDays(today, 7)
): SpineToday {
  const items: TodayItem[] = [];
  for (const r of rows) {
    const nextDue = r.last_done ? addDays(r.last_done.slice(0, 10), r.interval_days) : null;
    if (nextDue && nextDue > soon) continue; // not relevant yet — don't nag
    items.push({
      id: `${appId}:${r.id}`,
      label: r.title,
      status: nextDue ? bucketStatus(nextDue, today) : "due", // null = never done = due now
      due: nextDue ?? undefined,
      href: `/app/${appId}`,
    });
  }
  const overdue = items.filter((i) => i.status === "overdue").length;
  const due = items.filter((i) => i.status === "due").length;
  const summary =
    [overdue ? `${overdue} overdue` : "", due ? `${due} due` : ""].filter(Boolean).join(" · ") ||
    `${items.length} upcoming`;
  return card(appId, items, items.length, summary);
}
```
`card`, `bucketStatus`, `TodayItem`, `SpineToday` are already defined in `lib.ts`; `addDays` comes
from `@/lib/xp/tz` (same import the `bills` adapter uses). `card` sorts items worst-first, caps at
`ITEM_CAP`, and derives `severity` from the worst item — so the builder stays declarative.

## 2. The adapter — `src/lib/spine/adapters/medication.ts`
```ts
import "server-only";
import { todayKey, addDays } from "@/lib/xp/tz";
import { scheduleToday } from "../lib";
import type { SpineAdapter } from "../types";

// Read-only adapter: medications due now, overdue, or within the next 7 days.
// next_due = last_done + interval_days (a never-done med is due now) — mirrors ScheduleView.
export const adapter: SpineAdapter = {
  appId: "medication",
  async today(ctx) {
    const today = todayKey(ctx.tz, ctx.now);
    const soon = addDays(today, 7);
    const { data } = await ctx.supabase
      .from("schedule_items")
      .select("id, title, interval_days, last_done")
      .eq("user_id", ctx.userId) // ← spine invariant: every adapter query is user-scoped
      .eq("schedule_type", "medication"); // the discriminator from catalog config
    const rows = (data ?? []) as {
      id: number; title: string; interval_days: number; last_done: string | null;
    }[];
    if (rows.length === 0) return null; // no card if the user has no meds
    const result = scheduleToday("medication", rows, today, soon);
    return result.count > 0 ? result : null; // nothing actionable in-window → no card
  },
};
```

## 3. Register it
```bash
npm run build:spine   # regenerates src/lib/spine/_generated.ts (adds the medication import)
```
Never hand-edit `_generated.ts`. Once registered, `getToday()` includes the card whenever the user
has `medication` in their chosen apps (pins/recency, or a Phase-A explicit layout).

## 4. Test — `tests/spine-schedule.test.ts`
Pure, no DB or model — the house pattern (like the existing today-view tests).
```ts
import { describe, it, expect } from "vitest";
import { scheduleToday } from "@/lib/spine/lib";

const today = "2026-06-05";
const soon = "2026-06-12"; // addDays(today, 7)

describe("scheduleToday (medication)", () => {
  it("treats a never-done item as due now", () => {
    const c = scheduleToday("medication", [{ id: 1, title: "Vitamin D", interval_days: 1, last_done: null }], today, soon);
    expect(c.items[0].status).toBe("due");
    expect(c.severity).toBe("due");
    expect(c.count).toBe(1);
  });

  it("flags an item whose next dose is in the past as overdue", () => {
    const c = scheduleToday("medication", [{ id: 2, title: "Antibiotic", interval_days: 1, last_done: "2026-06-03" }], today, soon);
    expect(c.items[0].status).toBe("overdue"); // 06-03 + 1 = 06-04 < today
    expect(c.summary).toContain("overdue");
  });

  it("marks an item due exactly today as due", () => {
    const c = scheduleToday("medication", [{ id: 3, title: "Statin", interval_days: 1, last_done: "2026-06-04" }], today, soon);
    expect(c.items[0].status).toBe("due"); // 06-04 + 1 = 06-05 == today
  });

  it("keeps an item due within the horizon as upcoming", () => {
    const c = scheduleToday("medication", [{ id: 4, title: "Refill", interval_days: 6, last_done: "2026-06-04" }], today, soon);
    expect(c.items[0].status).toBe("upcoming"); // 06-10, ≤ soon
  });

  it("drops an item whose next dose is beyond the horizon", () => {
    const c = scheduleToday("medication", [{ id: 5, title: "Quarterly shot", interval_days: 30, last_done: "2026-06-05" }], today, soon);
    expect(c.count).toBe(0); // 07-05 > soon → not surfaced
  });
});
```

## Notes
- **RLS invariant:** the `.eq("user_id", ctx.userId)` filter is mandatory — under the digest cron's
  service-role client a missing filter would cross tenants (the spine has a unit test enforcing this).
- **Generalizes for free:** `carcare` (the only other `ui: "schedule"` app) gets an adapter by
  copying §2 and changing only `appId` + the `schedule_type` value — `scheduleToday` is shared.
  (`petcare`/`homemaint` are `checklist`-ui, not `schedule_items`; they need the Tier-2 `due_date`
  migration in [adapter-candidates.md](adapter-candidates.md), not this builder.) **Both medication
  and carcare are shipped.**
- **No migration:** everything above reads existing columns; this is a pure Tier-1 add per
  [adapter-candidates.md](adapter-candidates.md).
- **Governance:** per spine rules, an adapter is one file under `adapters/` + `build:spine`;
  collision-free with parallel build lanes.
