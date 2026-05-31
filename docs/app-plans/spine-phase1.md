# Spine — Phase 1: The Substrate (build-ready spec)

> ✅ **BUILT (2026-05-31).** Shipped: `app_usage` migration + `bump_app_usage` RPC (applied to remote),
> `src/lib/spine/` (types/ctx/lib/registry/usage + generated registry), 6 adapters
> (todo/habits/water/journal loggable; budget/bills read-only), `<TrackUsage>` beacon on the 4 custom
> proof pages + the factory dispatch, and `tests/unit/spine-lib.test.ts` (incl. the user_id-filter
> guard). Gates green: 544 tests, build compiles.

Companion to [../spine.md](../spine.md). Implements **Layer 0 (App Contract)** + **Layer 1 (usage
signal)** + the generalized `getToday()` reader, proven against **6 apps**. No user-facing surface
ships in Phase 1 — that's Phase 3 (`/today`) and Phase 2 (capture bar). Phase 1's job is to make the
substrate real, tested, and collision-free for parallel build.

**Definition of done:** `npm test` + `npm run build` green; the 6 adapters return correct
`today()`/`quickLog()` against real tables; `app_usage` records on app open; `getToday()` fans out
across the registry exactly like `ensureXp` fans out today.

---

## 0. Ground truth (verified against the live DB, 2026-05-31)

| App | `ui` | Table(s) | Key columns |
|-----|------|----------|-------------|
| todo | modern | `todos` | `completed bool`, `due_date date?`, `title`, `completed_at tstz?`, `priority int` |
| habits | modern | `habits` (`name`,`active bool`) + `habit_checkins` (`habit_id`,`checkin_date date`) | check-in dedup on (user,habit,date) |
| water | tracker (factory) | `daily_trackers` (`tracker_type='water'`,`value numeric`,`entry_date date`) | config: `dailyGoal:8`, `quickAdd:[1,2]`, `aggregate:sum` |
| journal | modern | `journal_entries` (`entry_date date`,`body`,`title?`,`mood?`) | one-ish per day |
| budget | modern | `budget_targets` (`category`,`planned numeric`,`month date`) + `expenses` (`amount`,`category`,`expense_date date`) | month = first-of-month DATE |
| bills | finance (factory) | `finance_items` (`item_type='bill'`,`amount`,`due_date date?`,`paid bool`) | unpaid + due soon |

Reused infra (do not reinvent):
- `createServerSupabase()` — `src/lib/supabase/server.ts`; user via `supabase.auth.getUser()`.
- tz helpers — `src/lib/xp/tz.ts`: `todayKey(tz, now)`, `localDayKey`, `addDays(dayKey, n)`, `isValidIanaZone`.
- tz resolution — `profiles.timezone` (nullable) → fall back `"UTC"` (copy from `ensureXp`).
- catalog config — `getApp("water")?.config?.dailyGoal` etc. from `@/lib/modern/catalog`.
- fan-out pattern — `src/lib/xp/compute.ts::ensureXp` (`Promise.all` across tables).

The mix is deliberate: **todo / habits / water / journal** get `quickLog()` (loggable);
**budget / bills** are `today()`-only (read surfaces) — proving the contract's optionality.

---

## 1. Data model — one migration

`src/supabase/migrations/<YYYYMMDDTHHMM>_app_usage.sql` (use a real UTC stamp at build time):

```sql
-- Layer 1 usage signal: recency + frequency + pins, one row per (user, app).
create table if not exists public.app_usage (
  user_id      uuid        not null references auth.users(id) on delete cascade,
  app_id       text        not null,
  last_used_at timestamptz not null default now(),
  use_count    integer     not null default 0,
  pinned       boolean     not null default false,
  primary key (user_id, app_id)
);

alter table public.app_usage enable row level security;

drop policy if exists "own app_usage" on public.app_usage;
create policy "own app_usage" on public.app_usage for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- "most recently used" lookups for the dashboard / grid ordering.
create index if not exists app_usage_recent_idx
  on public.app_usage (user_id, last_used_at desc);

-- Atomic bump: insert-or-increment in one round trip. SECURITY DEFINER but scoped
-- to auth.uid(), so a user can only ever touch their own row.
create or replace function public.bump_app_usage(p_app text)
returns void language sql security definer set search_path = public as $$
  insert into public.app_usage (user_id, app_id, last_used_at, use_count)
  values (auth.uid(), p_app, now(), 1)
  on conflict (user_id, app_id)
  do update set last_used_at = now(), use_count = public.app_usage.use_count + 1;
$$;

revoke all on function public.bump_app_usage(text) from public;
grant execute on function public.bump_app_usage(text) to authenticated;
```

Fold the schema delta into `docs/database.md` at integration (per the integrator role).

---

## 2. The contract — `src/lib/spine/types.ts`

```ts
import "server-only";
import type { createServerSupabase } from "@/lib/supabase/server";

type Supabase = Awaited<ReturnType<typeof createServerSupabase>>;

export interface SpineCtx {
  supabase: Supabase;
  userId: string;
  tz: string;       // resolved IANA zone, "UTC" fallback
  now: Date;
}

// ── FINALIZED 2026-05-31. Phases 3-5 (dashboard, digest, AI nudges) depend on this shape. ──
export type TodayStatus = "overdue" | "due" | "upcoming" | "done";
export const STATUS_ORDER: Record<TodayStatus, number> = { overdue: 0, due: 1, upcoming: 2, done: 3 };
export const ITEM_CAP = 5;     // a card returns ≤ ITEM_CAP items; `count` carries the true total

export interface TodayItem {
  id: string;            // app-namespaced + stable, e.g. "todo:42"
  label: string;
  status: TodayStatus;   // REQUIRED — drives grouping + sort
  due?: string;          // ISO date/datetime; omit if no due time
  href?: string;         // item deep link; consumer falls back to the card href
}

export interface SpineToday {
  appId: string;
  severity: TodayStatus; // card-level WORST actionable state — the single sort + notify-threshold key
  count: number;         // true total pending / headline metric (≥ items.length)
  summary: string;       // REQUIRED — one line for card AND digest, e.g. "3 open · 1 overdue"
  items: TodayItem[];    // actionable subset, PRE-SORTED worst-first, capped at ITEM_CAP
  progress?: { current: number; target: number; unit?: string };  // optional ring/bar (water 5/8, budget $/$)
  href?: string;         // card deep link; consumer defaults to `/app/${appId}`
}
// Invariants (contractual):
//  • items are pre-sorted worst-first (STATUS_ORDER, then soonest due) and capped at ITEM_CAP.
//  • count is the TRUE total, so a consumer can render "+N more" when count > items.length.
//  • name/icon are NOT here — look them up from the catalog via getApp(appId).
//  • SpineToday describes STATE only. "Should we notify?" is Layer-4 policy, never an adapter field.

export interface QuickLogResult {
  ok: boolean;
  appId: string;
  message: string;       // human-confirmable, e.g. "Logged 2 glasses"
  href?: string;
  undo?: { table: string; id: number };   // the inserted row — Phase 2 capture offers Undo from this
}

export interface SpineAdapter {
  appId: string;
  today(ctx: SpineCtx): Promise<SpineToday | null>;     // null = nothing relevant
  quickLog?(ctx: SpineCtx, input: string): Promise<QuickLogResult>;
  match?(input: string): number;                        // 0..1 capture confidence
}
```

### Context builder — `src/lib/spine/ctx.ts`

```ts
import "server-only";
import { createServerSupabase } from "@/lib/supabase/server";
import type { SpineCtx } from "./types";

/** Build a SpineCtx for the signed-in user. Returns null if not authed. */
export async function getSpineCtx(now: Date = new Date()): Promise<SpineCtx | null> {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  let tz = "UTC";
  const { data: prof } = await supabase.from("profiles").select("timezone").eq("id", user.id).single();
  if (prof?.timezone) tz = prof.timezone as string;
  return { supabase, userId: user.id, tz, now };
}
```

---

## 3. Registry — generated, collision-free (mirrors the catalog)

To preserve the one-file-per-app property (so parallel-build lanes never edit a shared file),
the registry is **generated**, exactly like `catalog/_generated.ts`.

```
src/lib/spine/
  types.ts
  ctx.ts
  registry.ts        — getToday() + route(); imports ADAPTERS from _generated
  _generated.ts      — GENERATED; never hand-edit
  adapters/
    todo.ts  habits.ts  water.ts  journal.ts  budget.ts  bills.ts
  lib.ts             — pure, unit-tested helpers (see §5)
```

Each adapter file exports `export const adapter: SpineAdapter = { appId: "<id>", ... }`.

`scripts/build-spine-registry.mjs` (model on `scripts/build-catalog.mjs`): scan `adapters/*.ts`,
emit `_generated.ts`:

```ts
// GENERATED by scripts/build-spine-registry.mjs — do not edit.
import { adapter as todo } from "./adapters/todo";
import { adapter as habits } from "./adapters/habits";
// …one per file…
export const ADAPTERS = [todo, habits, water, journal, budget, bills];
```

`package.json`: add `"build:spine": "node scripts/build-spine-registry.mjs"` and chain it into the
existing `prebuild`/`pretest` alongside `build:catalog` (so `_generated.ts` is always fresh).

### `registry.ts`

```ts
import "server-only";
import { ADAPTERS } from "./_generated";
import type { SpineCtx, SpineToday, QuickLogResult } from "./types";

/** Fan out today() across the given apps (default: all registered). Mirrors ensureXp's Promise.all. */
export async function getToday(ctx: SpineCtx, appIds?: string[]): Promise<SpineToday[]> {
  const chosen = appIds ? ADAPTERS.filter((a) => appIds.includes(a.appId)) : ADAPTERS;
  const results = await Promise.all(
    chosen.map((a) => a.today(ctx).catch(() => null)),   // one bad adapter never sinks the page
  );
  return results.filter((r): r is SpineToday => r != null);
}

/** Route a capture string to the highest-confidence loggable adapter. (Surface = Phase 2.) */
export async function route(ctx: SpineCtx, input: string): Promise<QuickLogResult | null> {
  const ranked = ADAPTERS
    .filter((a) => a.quickLog && a.match)
    .map((a) => ({ a, score: a.match!(input) }))
    .filter((x) => x.score > 0)
    .sort((x, y) => y.score - x.score);
  if (!ranked.length) return null;
  return ranked[0].a.quickLog!(ctx, input);
}
```

---

## 4. The 6 proof adapters (exact logic)

All queries are RLS-scoped (the ctx supabase client carries the user session); still pass
`.eq("user_id", ctx.userId)`. `today = todayKey(ctx.tz, ctx.now)`. Every loggable `quickLog` does its
insert with `.select("id").single()` and returns `undo: { table, id }` (consumed by Phase 2 capture's
Undo; allowlisted in `CAPTURE_TABLES`).

> 🔒 **SECURITY INVARIANT (enforced, not just convention):** **every** adapter query — `today()` and
> `quickLog()` — MUST filter `.eq("user_id", ctx.userId)`. Under a session client a missing filter is a
> harmless no-op (RLS catches it), **but Phase 4 runs these same adapters under the service-role admin
> client (RLS bypassed)** — there, one missing filter leaks *all users'* rows into a digest = a
> cross-tenant breach. Guard it: (a) a unit test asserts each adapter's query builder received a
> `user_id` eq (§7); (b) recommended defense-in-depth — adapters get `userId` only via `ctx` and never
> issue an unfiltered `from()` (code-review checklist item in the governance rule).

### `adapters/todo.ts` — loggable
- **today:** `todos` where `completed=false`, select `id,title,due_date`. Pure `todoToday(rows, today)`:
  status `overdue` if `due_date < today`, `due` if `== today`, else `upcoming`; `count` = open rows;
  `summary` = `"${count} open · ${overdue} overdue"`; `href` `/app/todo`. Return `null` if 0 open.
- **quickLog(input):** strip prefix → `insert {user_id, title}`. `message` `"Added todo"`, href `/app/todo`.
- **match:** `1` if `/^(todo|t)\b/i`; `0.2` bare fallback (lowest-priority catch-all).

### `adapters/habits.ts` — loggable
- **today:** load active `habits (id,name)` + today's `habit_checkins (habit_id)`. Pure
  `habitsToday(habits, checkedIds, today)`: `remaining = habits not in checkedIds`; one `due` item per
  remaining (`label` = habit name, href `/app/habits`); `count` = remaining; `summary`
  `"${done}/${total} done"`. Return `null` if no active habits.
- **quickLog(input):** strip `habit|h|check` prefix → fuzzy-match a habit by name (`lib.fuzzyFind`);
  `upsert habit_checkins {user_id, habit_id, checkin_date: today}` (dedupe). `message`
  `"Checked in: ${name}"`. If no match → `{ok:false, message:"No habit matches \"…\""}`.
- **match:** `1` if `/^(habit|check|h)\b/i`, else `0`.

### `adapters/water.ts` — loggable (factory tracker)
- **goal:** `getApp("water")?.config?.dailyGoal ?? 8`.
- **today:** `daily_trackers` where `tracker_type='water'`, `entry_date=today`, select `value`. Pure
  `sumToday(rows, goal)`: `total = Σvalue`; `count = total`; `status` `done` if `total>=goal` else
  `due`; `summary` `"${total}/${goal} glasses"`; href `/app/water`. Return `null` only if total 0
  AND you prefer hiding — else show the "0/8" nudge (recommended: show it).
- **quickLog(input):** `lib.parseLeadingNumber(input)` (e.g. "w 2" → 2; default 1) →
  `insert daily_trackers {user_id, tracker_type:"water", value:n}`. `message` `"Logged ${n} glass(es)"`.
- **match:** `1` if `/^(water|w)\b/i`, else `0`.

### `adapters/journal.ts` — loggable
- **today:** `journal_entries` where `entry_date=today` limit 1. If present → `{count:0, summary:"Journaled",
  items:[{status:"done"}]}`; else one `due` item `"Write today's entry"` href `/app/journal`.
- **quickLog(input):** strip `journal|j` prefix → `insert {user_id, body, entry_date: today}`.
  `message` `"Saved journal entry"`.
- **match:** `1` if `/^(journal|j)\b/i`, else `0`.

### `adapters/budget.ts` — read-only (no quickLog)
- **monthStart:** `` `${today.slice(0,7)}-01` `` (budget_targets.month is first-of-month DATE).
- **today:** sum `budget_targets.planned` where `month=monthStart`; sum `expenses.amount` where
  `expense_date >= monthStart and <= today`. Pure `budgetToday(planned, spent)`: `pct = planned>0 ?
  spent/planned : null`; `status` `overdue` if `pct>1`; `count` = `pct!=null ? round(pct*100) : 0`;
  `summary` `"$${spent} of $${planned}${pct!=null?` · ${round(pct*100)}%`:""}"`; href `/app/budget`.
  Return `null` if no targets AND no spend.
- **no quickLog** (expense capture belongs to the `expenses` app). **no match.**

### `adapters/bills.ts` — read-only (no quickLog)
- **window:** `soon = addDays(today, 7)`.
- **today:** `finance_items` where `item_type='bill'`, `paid=false`, select `id,name,amount,due_date`.
  Pure `billsToday(rows, today, soon)`: keep rows with `due_date != null && due_date <= soon`; status
  `overdue` if `due_date < today` else `due`; one item per bill (`label` `"${name} — $${amount}"`,
  href `/app/bills`); `count` = kept; `summary` `"${count} due soon"`. Return `null` if 0.
- **no quickLog** (needs name+amount+date — too lossy for one line in v1). **no match.**

---

## 5. Pure helpers — `src/lib/spine/lib.ts` (the test surface)

Keep all branchy logic pure (no DB), exactly like `scoreDay`/`parseStepDuration`:

```ts
export function parseLeadingNumber(s: string, fallback = 1): number   // "w 2"→2, "water"→1, "w 2.5"→2.5
export function stripPrefix(s: string, prefixes: string[]): string    // "todo call mom"→"call mom"
export function fuzzyFind<T>(q: string, items: T[], key: (t:T)=>string): T | null
export function bucketStatus(due: string|null, today: string): TodayStatus       // overdue|due|upcoming
export function worstStatus(items: TodayItem[]): TodayStatus          // min by STATUS_ORDER → card severity
export function sortItems(items: TodayItem[]): TodayItem[]            // STATUS_ORDER, then soonest due; caps at ITEM_CAP
export function todoToday(rows, today): SpineToday
export function habitsToday(habits, checkedIds: Set<number>, today): SpineToday
export function sumToday(rows, goal): SpineToday          // water
export function budgetToday(planned: number, spent: number): SpineToday
export function billsToday(rows, today, soon): SpineToday
```

Each `*Today` builder must, before returning: run `items = sortItems(items)`, set
`severity = worstStatus(items)`, and attach `progress` when the app has a natural target
(water `{current: total, target: goal, unit:"glasses"}`; habits `{done, total}`; budget
`{spent, planned, unit:"$"}`). todo/bills omit `progress`. Adapters = thin: query → call the pure fn →
return. **Adapters contain no testable branching.**

---

## 6. Usage tracking — beacon, not render-write

Writing during RSC render is discouraged; use a mount-time client beacon → server action.

- `src/lib/spine/usage.ts` (server action):
  ```ts
  "use server";
  import { createServerSupabase } from "@/lib/supabase/server";
  export async function recordUsage(appId: string) {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.rpc("bump_app_usage", { p_app: appId });   // atomic insert-or-increment
  }
  ```
- `src/components/modern/TrackUsage.tsx` (`"use client"`): `useEffect(() => { recordUsage(appId) }, [appId])`,
  renders `null`.
- **Call sites (Phase 1):**
  - `src/app/app/[id]/page.tsx` (factory dispatch) → `<TrackUsage appId={id} />` — covers **water, bills**
    and every other factory app for free.
  - Custom proof pages → add `<TrackUsage appId="…" />`: `todo`, `habits`, `journal`, `budget` (4 one-line edits).
  - Custom apps outside the proof set are wired incrementally in later phases (or via the governance rule).

---

## 7. Verification

**Gate (required):** `npm test` + `npm run build` green; secret-scan clean; `npm run build:spine`
emits `_generated.ts` with all 6 adapters.

**Unit tests** — `tests/unit/spine-lib.test.ts`:
- `parseLeadingNumber`: "w 2"→2, "water"→1, "w 2.5"→2.5, "w -3"→1, "abc"→fallback.
- `stripPrefix`: prefix removed case-insensitively; bare text unchanged.
- `bucketStatus`: yesterday→overdue, today→due, tomorrow→upcoming, null→upcoming.
- `worstStatus`: `[due, overdue, upcoming]`→overdue; `[done, done]`→done; `[]`→done.
- `sortItems`: overdue before due before upcoming before done; soonest `due` first within a status; truncates to `ITEM_CAP`.
- `todoToday`: counts open, flags overdue, `severity` = worst, `count` = true total, `summary` text; no `progress`.
- `habitsToday`: remaining = active − checked; `progress {current: done, target: total}`; done/total summary; empty when none active.
- `sumToday` (water): total vs goal; `progress {current: total, target: goal, unit:"glasses"}`; `severity` done at/over goal else due; "0/8" when empty.
- `budgetToday`: pct math; `progress {current: spent, target: planned, unit:"$"}`; `severity` overdue when over; null-planned path.
- `billsToday`: keeps due-soon + overdue; drops far-future and no-due-date; `count` = total kept; `items` capped at ITEM_CAP; `severity` = worst.
- **Shape invariants:** every `*Today` result has `count ≥ items.length`, `items.length ≤ ITEM_CAP`, `items` pre-sorted, and `severity === worstStatus(items)`.
- `route()` ranking: "w 2"→water, "todo x"→todo, "h run"→habits, "random"→todo fallback (0.2).
- **🔒 user_id-filter guard:** for each adapter, a test (mock supabase query builder) asserts both
  `today()` and `quickLog()` called `.eq("user_id", <ctx.userId>)` — the invariant that keeps the
  service-role digest path (Phase 4) from leaking across tenants. A missing filter must fail CI.

**Dev-only smoke (optional, not shipped):** a guarded RSC at `src/app/app/spine-debug/page.tsx`
(render only when `isAdmin()`), dumping `getToday(ctx)` JSON, to eyeball the 6 adapters against real
data. Remove or leave admin-gated before Phase 3.

---

## 8. File manifest (what the build touches)

**New (island-safe):**
```
src/supabase/migrations/<stamp>_app_usage.sql
src/lib/spine/{types,ctx,registry,lib,usage}.ts
src/lib/spine/_generated.ts            (generated)
src/lib/spine/adapters/{todo,habits,water,journal,budget,bills}.ts
src/components/modern/TrackUsage.tsx
scripts/build-spine-registry.mjs
tests/unit/spine-lib.test.ts
```
**Edited (small, additive):**
```
package.json                           (build:spine + prebuild/pretest chain)
src/app/app/[id]/page.tsx              (+ <TrackUsage appId={id}/>)
src/app/app/{todo,habits,journal,budget}/page.tsx   (+ <TrackUsage/>, 1 line each)
docs/database.md                       (app_usage delta, at integration)
```

This is mostly **new files** — friendly to a single focused PR or one parallel-build lane. The only
shared edits are `package.json` and the factory dispatch page; sequence those last.

---

## 9. Risks & open decisions (Phase 1 scope)

- **Registry generation vs hand-imports.** Spec'd generated (consistent with catalog, collision-free).
  If you'd rather not add a second generator now, a hand-maintained `registry.ts` works for 6 adapters
  — but then it's a shared file and the governance rule must serialize edits to it. *Recommend generated.*
- **`SpineToday` shape — ✅ RESOLVED (2026-05-31).** Finalized in §2: added required `severity`
  (card-level sort + notify key), required `summary`, required `item.status`, optional `progress`
  (ring/bar metric), card-level `href`, and the `ITEM_CAP`/`count`-is-true-total/pre-sorted
  invariants. Name/icon stay in the catalog; notify policy stays in Layer 4. Phases 3–5 can build
  against this without retrofitting adapters.
- **`today()` "empty" policy** — return `null` (hide) vs a zero-state nudge (e.g. water "0/8"). Spec
  leans: hide when nothing actionable, **except** habit/water/journal where the zero-state *is* the
  nudge. Confirm per app.
- **Usage throttle** — current `bump_app_usage` updates on every mount. Fine at this scale; add a
  `now() - last_used_at > interval '10 min'` guard later if writes get noisy.
- **Not in Phase 1:** the capture *bar* UI (Phase 2), `/today` (Phase 3), pins UI, notifications.

## 10. Hand-off

Per the spec-writer role this is plan-only — no code, migration, or git here. Build path options:
(a) one focused PR, or (b) a single parallel-build lane (it's island-safe). When built, the governance
rule from [spine.md §5](../spine.md) kicks in: **every new app ships a `src/lib/spine/adapters/<id>.ts`
or justifies opting out, decided in its app-plan before building.**
