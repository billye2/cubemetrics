# Spine — Phase 3: Today, the anchor ritual (build-ready spec)

> ✅ **BUILT + SHIPPED (2026-05-31, PR #107, `master`).** `/today` is the logged-in home (grid → `/apps`);
> `TodayHeader`/`TodayCard`/`TodayBody`, `getToday`+`ensureXp` fan-out, 43 back-links repointed. 555 tests.

Companion to [../spine.md](../spine.md) (Layer 3) and Phases [1](spine-phase1.md)/[2](spine-phase2.md).
Phase 1 gave `getToday()`; Phase 2 gave capture. **Phase 3 is the destination** — the logged-in home
becomes a once-(or-twice)-daily ritual, not the 86-tile junk drawer. It's the surface every Phase-4
nudge will deep-link into.

**Depends on:** Phase 1 (registry + `getToday` + `app_usage`) and ideally Phase 2 (capture) merged.
**DoD:** logging in lands on `/today`; it shows your day grouped by urgency (built from `getToday()`),
your streak/level/quests (from `ensureXp`), a prominent capture CTA, and a morning/evening framing;
the full grid still exists at `/apps`; `npm test` + `npm run build` green.

> **Design promise (from spine.md):** an *anchor is a thing you DO*, not a board you check. The
> "doing" in v1 = capture-in-place (Phase 2) + the morning-plan / evening-close framing + quests.
> Inline check-off is a scoped 3b enhancement (§8), not v1.

---

## 0. Ground truth (verified 2026-05-31)

- **Home today** (`src/app/page.tsx`): logged-in renders `<Shell right={SignOutButton}>` with
  `XpStrip` → `AppSearch` → category grid (`AppTile`s). `XpStrip`, `AppTile`, `Landing` are local
  functions there. `ensureXp` is already called here (best-effort try/catch) and `TimezoneSync` syncs
  the zone.
- **Reuse, don't rebuild:** `getToday(ctx, appIds?)` → `SpineToday[]` (Phase 1); `ensureXp(supabase,
  userId)` → `XpSummary` (`level`, `streak`, `todayPoints`, `todayQuests`, …); `getSpineCtx()`;
  `getApp(appId)` for name/icon; `localHour(now, tz)` from `src/lib/xp/tz.ts`; `Shell`/`Card`;
  `QuickCapture` (Phase 2).
- **`SpineToday.severity`** (finalized in Phase 1) is the grouping/sort key; **`progress`** drives the
  ring/bar; **name/icon come from the catalog**, not the payload.
- **Back-links:** exactly **43** `/app/*/page.tsx` use `back={{ href: "/", label: "Apps" }}` — the
  bounded edit set when the grid moves to `/apps` (§3).

---

## 1. Routing (recommended: Today *is* home)

| Route | Before | After |
|-------|--------|-------|
| `/` | logged-in grid / logged-out Landing | logged-out **Landing**; logged-in → `redirect("/today")` |
| `/today` | — | **the ritual** (new) |
| `/apps` | — | the **moved grid** (XpStrip + AppSearch + category tiles + TimezoneSync) |

- `src/app/page.tsx` shrinks to: `if (!user) return <Landing/>; redirect("/today");`. Keep `Landing`
  here (or move to a component).
- `src/app/apps/page.tsx` = today's logged-in `Home` body verbatim (grid + `XpStrip` + `AppSearch` +
  `TimezoneSync`), `back={{ href: "/today", label: "Today" }}`.
- **Back-link migration:** replace `back={{ href: "/", label: "Apps" }}` → `back={{ href: "/apps",
  label: "Apps" }}` across the 43 pages (mechanical find/replace; the one custom `back` to
  `/app/journal` is unaffected). Items/cards in `/today` deep-link to `/app/<id>`; their back lands on
  `/apps` (acceptable; uniform).
- Auth callback already returns to `/`, which now redirects to `/today` — no callback change needed.

*(Lower-churn alternative in §9 if you'd rather not move the grid.)*

---

## 2. The page — `src/app/today/page.tsx` (RSC, `force-dynamic`)

```tsx
export const dynamic = "force-dynamic";

export default async function TodayPage() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");

  // tz for mode + greeting
  const { data: prof } = await supabase.from("profiles").select("handle, timezone").eq("id", user.id).single();
  const tz = prof?.timezone ?? "UTC";
  const now = new Date();
  const ctx = { supabase, userId: user.id, tz, now };

  // pick which apps to show (pins → recency → default all), capped
  const { data: usage } = await supabase
    .from("app_usage").select("app_id, pinned")
    .eq("user_id", user.id)
    .order("pinned", { ascending: false }).order("last_used_at", { ascending: false })
    .limit(12);
  const chosen = chooseApps(usage ?? [], REGISTERED_APP_IDS, 8);   // pure (§6); [] → all registered

  // fan out — getToday + XP in parallel; both best-effort
  const [today, xp] = await Promise.all([
    getToday(ctx, chosen).catch(() => []),
    ensureXp(supabase, user.id).catch(() => null),
  ]);

  const mode = pickMode(localHour(now, tz) ?? 9);                  // morning | day | evening
  const groups = groupBySeverity(today);                          // { attention, upcoming, done }

  return (
    <Shell right={<SignOutButton />}>
      <TimezoneSync knownTz={prof?.timezone ?? null} />
      <TodayHeader mode={mode} name={prof?.handle ?? "Friend"} xp={xp} />
      <TodayBody mode={mode} groups={groups} xp={xp} />
      <Link href="/apps" className="…">Browse all apps →</Link>
    </Shell>
  );
}
```

`REGISTERED_APP_IDS` = `ADAPTERS.map(a => a.appId)` exported from the registry.

---

## 3. Sections & components

### `TodayHeader` (server) — greeting + the hook
- Greeting by `mode`: morning "Plan your day", day "Today", evening "Close out your day" + `name`.
- **Streak is the hero** (foreshadows Phase 4 streak-save): big `${streak}🔥`, level pill + progress
  bar (reuse `XpStrip`'s markup), `+${todayPoints} today`. Links to `/app/xp`.
- **Quests row:** `xp.todayQuests` as chips (`{icon} {current}/{target}`) — the existing daily-engagement
  mechanic, surfaced where it'll actually be seen.

### `TodayCard` (server) — one per `SpineToday`
```
icon+name  ← getApp(appId)                      [severity accent]
summary line                                     ("3 open · 1 overdue")
progress ring/bar  ← if progress present         (reuse XpStrip bar)
items (≤ITEM_CAP): {label} {status badge} {due}  → href || /app/${appId}
card → href || /app/${appId}
```
Severity accent: `overdue`→rose, `due`→amber, `upcoming`→zinc, `done`→emerald. Status badges reuse
the same scale.

### `TodayBody` (server) — grouped, mode-weighted
- **Morning:** lead **Needs attention** (overdue+due) → **Upcoming** → collapsed **Done today**.
- **Evening:** lead **Done today** (the payoff) + a one-tap **journal reflect** (opens capture
  pre-targeted to journal) → tomorrow's **Upcoming** → streak status.
- **Day:** Needs attention → Upcoming → Done.
- **Prominent capture CTA** at top of the body in every mode: a `＋ Capture` button that opens the
  Phase-2 `QuickCapture` sheet (reuse the component; expose an `openOnMount`/imperative open, or simply
  render a labeled trigger that toggles the same sheet).

### `ModeToggle` (client, small) — morning / day / evening override
Optional segmented control; persists choice in `localStorage` for the session. Defaults to the
hour-derived `mode`.

### Empty state
If `today` is all-empty AND `xp` shows no activity (new user): an onboarding card — "Your day's a
blank slate. Capture your first thing →" opening `QuickCapture`. New users with no `app_usage` fall
back to all registered adapters via `chooseApps`.

---

## 4. The "active ritual" line (v1 scope)

v1 makes the ritual *active* via **capture-in-place** (log water/habit/journal/todo right from
`/today` through the Phase-2 sheet) + the morning/evening framing + quests. It does **not** yet check
items off inline — tapping an item deep-links to its app. That's the deliberate v1/3b seam (§8); call
it out so it's a known boundary, not an oversight.

---

## 5. Performance & resilience
- `getToday` + `ensureXp` run in **parallel**; both `.catch` to empty/null so one slow/broken source
  never blanks the page (matches the existing home `ensureXp` try/catch).
- `chooseApps` caps the fan-out at **8** apps → bounded query count. Per-adapter errors already
  swallow to `null` inside `getToday` (Phase 1).
- `force-dynamic` (auth-aware, no stale cache) — same as every other page.

---

## 6. Pure helpers — `src/lib/spine/today-view.ts` (the test surface)

```ts
export type Mode = "morning" | "day" | "evening";
export function pickMode(hour: number): Mode;                 // <12 morning, 12–16 day, ≥17 evening
export function chooseApps(usage: {app_id:string; pinned:boolean}[],
                           registered: string[], cap: number): string[];  // pins→recency→dedupe→cap; []→registered
export interface TodayGroups { attention: SpineToday[]; upcoming: SpineToday[]; done: SpineToday[]; }
export function groupBySeverity(today: SpineToday[]): TodayGroups;        // overdue|due→attention; upcoming; done
export function sortCards(cards: SpineToday[]): SpineToday[];             // STATUS_ORDER(severity), then count desc
```
Components stay declarative; all bucketing/ordering is pure and tested.

---

## 7. Tests — `tests/unit/spine-today-view.test.ts`
- `pickMode`: 6→morning, 13→day, 19→evening (boundaries 12/17).
- `chooseApps`: pinned float to front; then recency order; dedupe; cap respected; **empty usage →
  full registered list**; ignores usage ids with no adapter.
- `groupBySeverity`: overdue+due→attention, upcoming→upcoming, done→done; empty input → empty groups.
- `sortCards`: overdue card before due before upcoming before done; ties broken by `count` desc.

---

## 8. Phase 3b — deferred (spec'd, not v1)
- **Inline check-off / quick actions.** Add an optional `act?(ctx, itemId, action): Promise<QuickLogResult>`
  to `SpineAdapter` so a `TodayCard` can complete a todo or check in a habit **without leaving
  `/today`** — the strongest "active ritual" upgrade. Deferred because it needs per-app mutation
  wiring + an optimistic-UI client layer; v1 deep-links instead.
- **Explicit pins UI.** `app_usage.pinned` exists; v1 orders by recency only. A pin toggle on `/apps`
  tiles (or a `/today` "manage" affordance) is a small follow-on.

---

## 9. Risks & open decisions
- **Routing churn (the main call).** *Recommended:* Today `= /` (redirect), grid `→ /apps`, 43
  back-link edits — honors "Today is home." *Lower-churn alt:* keep the grid at `/`, add `/today`,
  and make `XpStrip`/a header link point to it; no back-link edits, but Today isn't the default
  landing (weaker on the engagement goal). **Pick one before building.**
- **Mode boundaries** (12 / 17) — tune to real habits; the toggle covers mismatches.
- **Dashboard size** — cap 8 shown; revisit once more than ~6 apps have adapters.
- **`done` group default** — collapsed (morning) vs expanded (evening) — spec'd above; confirm.
- **Capture trigger ergonomics** — reuse the single global `QuickCapture` sheet vs a second inline
  instance; recommend reusing one component with an imperative open to avoid duplicate state.

## 10. Hand-off
Plan-only (spec-writer role). Build after Phases 1–2. After this, the only spine surface left is the
one that actually drives *return* usage — **Phase 4: the proactive engine** (digest + due-nudges +
streak-save), which reads the very same `getToday()`/`ensureXp` this phase renders.
