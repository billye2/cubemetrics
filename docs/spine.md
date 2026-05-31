# The Spine

A plan for turning XP Boost's ~86 standalone apps into one product that *pulls you back daily*.

> **Status:** ✅ **BUILT + SHIPPED (2026-05-31).** All five core phases are live on `master` (PRs #105–#109): substrate → capture → anchor (`/today`) → proactive engine → insight line. Layer 6 (cross-app links) remains opportunistic. The proactive engine + AI line are dormant pending ops provisioning (Resend/cron/secrets — see [phase 4](app-plans/spine-phase4.md) §11/§15 and [phase 5](app-plans/spine-phase5.md)). Per-phase detail in `spine-phase1..5.md`.
> **North star:** the spine is not "done" when the apps feel coherent — it's done when **the product reaches out and brings you back on its own.**

---

## 1. The problem

> *"It becomes junk the day breadth outpaces the spine."* — the owner's read.

At 86 apps, the only thing holding the suite together is the **XP layer**. Everything else is a
silo: each app has its own page, its own `actions.ts`, its own table, reachable only if you
remember it exists and navigate to it. Two failure modes follow:

1. **Coherence** — the apps don't reinforce each other; the home grid is a junk drawer.
2. **Engagement** — every surface is *pull*. The product waits for you to show up. Nothing brings
   you back. There is **no proactive layer at all** today — no reminders, no digest, no nudges.

The spine fixes both, but #2 is the higher-leverage one. A coherent product you forget to open is
still dead. So the architecture below is built so that one substrate (`today()`) feeds both a
coherent destination **and** a proactive engine that pulls you to it.

## 2. The key insight

`src/lib/xp/compute.ts::ensureXp()` is **already a working spine prototype**. It fans out across ~12
app tables (`Promise.all`), normalizes them into one model, caps/scores per source, and produces a
cross-app surface (streaks, levels, breadth, quests). The spine is **generalizing that fan-out from
"scoring" to "everything"** — and then pointing the same aggregated data at a proactive channel.

## 3. Architecture — layers

```
Layer 0  App Contract:    today() / quickLog()                  ← the keystone
Layer 1  Usage signal:    app_usage (recency, count, pins)
Layer 2  Capture (pull/in): global quick-capture bar → quickLog()
Layer 3  Today = anchor ritual (active destination, not a passive board)
Layer 4  Proactive spine (push): digest + due-nudges + streak-save   ← the engagement engine
Layer 5  AI nudges over today() (delight on the channel)
Layer 6  Curated cross-app links (ongoing, opportunistic)
```

`today()` feeds Layers 3, 4, **and** 5 — so once the contract exists, the proactive engine is nearly
free. That is the whole argument for building the substrate first: **everything else rides on it.**

### Layer 0 — The App Contract (keystone)

A thin, **optional** per-app adapter that exposes an app to shared surfaces. Because the catalog
`AppEntry` is generated from data-only JSON (no functions), adapters live in a parallel registry —
**one file per app**, so parallel-build never collides (see [agent-orchestration.md](agent-orchestration.md)).

```
src/lib/spine/
  types.ts            — the interfaces below
  registry.ts         — imports every adapter; getToday() / route() fan-outs
  adapters/<id>.ts    — one per opted-in app: { today, quickLog?, match? }
```

```ts
// src/lib/spine/types.ts  (FINALIZED 2026-05-31 — Phases 3-5 depend on this; see app-plans/spine-phase1.md §2)
export type TodayStatus = "overdue" | "due" | "upcoming" | "done";
export const STATUS_ORDER: Record<TodayStatus, number> = { overdue: 0, due: 1, upcoming: 2, done: 3 };
export const ITEM_CAP = 5;                          // cards return ≤5 items; `count` carries the true total

export interface TodayItem {
  id: string;                                       // app-namespaced + stable, e.g. "todo:42"
  label: string;
  status: TodayStatus;                              // drives grouping + sort
  due?: string;                                     // ISO date/datetime; omit if none
  href?: string;                                    // item deep link; falls back to the card href
}
export interface SpineToday {
  appId: string;
  severity: TodayStatus;                            // card-level worst actionable state — the sort + notify key
  count: number;                                    // true total pending / headline metric (≥ items.length)
  summary: string;                                  // one line for card AND digest, e.g. "3 open · 1 overdue"
  items: TodayItem[];                               // actionable subset, pre-sorted worst-first, capped at ITEM_CAP
  progress?: { current: number; target: number; unit?: string };  // optional ring/bar (water 5/8, budget $/$)
  href?: string;                                    // card deep link; consumer defaults to `/app/${appId}`
}
// Invariants: items pre-sorted worst-first & capped; count = true total; name/icon come from the
// catalog (getApp(appId)), NOT this payload; SpineToday describes STATE, not notify policy (that's Layer 4).
export interface QuickLogResult { ok: boolean; appId: string; message: string; href?: string;
  undo?: { table: string; id: number }; }                  // inserted row — Phase 2 capture offers Undo

export interface SpineCtx { supabase: Supabase; userId: string; tz: string; now: Date; }

export interface SpineAdapter {
  appId: string;
  today(ctx: SpineCtx): Promise<SpineToday | null>;        // null = nothing relevant today
  quickLog?(ctx: SpineCtx, input: string): Promise<QuickLogResult>;
  match?(input: string): number;                           // 0..1 — should this app take the capture?
}
```

`registry.getToday(ctx)` is the generalized `ensureXp` fan-out: call the adapters for the user's
**pinned / most-used** apps in parallel (RLS scopes every query), drop nulls, return the set. Reuse
`ensureXp`'s tz handling and `Promise.all` pattern verbatim.

### Layer 1 — Usage signal (the design hinge)

Without a usage signal, every aggregation surface shows all 86 apps (noise — the exact disease) or
nothing. So this is foundational, not cosmetic.

```sql
-- app_usage: recency + frequency + explicit pins, one row per (user, app)
create table public.app_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  app_id text not null,
  last_used_at timestamptz not null default now(),
  use_count integer not null default 0,
  pinned boolean not null default false,
  primary key (user_id, app_id)
);
alter table public.app_usage enable row level security;
create policy "own app_usage" on public.app_usage for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

A shared `bumpUsage(appId)` server helper, called on every `/app/<id>` render and every `quickLog`,
throttled (skip if `last_used_at` within ~10 min) to avoid write storms. Powers: the dashboard's
"apps you actually use," a recency-ordered home grid, and capture suggestions.

### Layer 2 — Universal Quick Capture (input spine)

One `<QuickCapture>` in the `Shell` header, present on **every** page. Posts to a `capture(input)`
server action → `registry.route(input)` runs each adapter's `match()` → highest-confidence app's
`quickLog()` writes the row → `revalidatePath`. Kills the top-of-funnel tax ("which of 86 apps do I
open?").

- **v1 structured grammar:** leading token / picker — `water 2`, `todo call mom`, `$12 lunch`,
  `mood stressed`. Deterministic, testable (pure `match()` + `parse` functions, unit-tested like
  `parseStepDuration`).
- **v2 NL parsing:** a cheap Haiku pass via the **AI Gateway** (`"provider/model"` string) turns
  free text into a structured intent, then the same routing applies.

> **Phase 2 is specced build-ready** in [app-plans/spine-phase2.md](app-plans/spine-phase2.md) —
> the `<QuickCapture>` bar (mirrors `HeaderFeedback`, mounts in `Shell`), `capture()`/`captureTo()`/
> `undoCapture()` actions, the disambiguation picker, and the undo allowlist.

### Layer 3 — Today: an anchor *ritual*, not a board

A dashboard is a thing you *check*. An **anchor is a thing you *do* daily.** `/today` (the logged-in
home default; the grid moves to `/apps`, usage-ordered) is a two-beat ritual built on `getToday()` +
the `ensureXp` summary:

- **Morning — plan:** what's due/overdue across your apps, today's intentions, one-tap capture.
- **Evening — close:** what got done, streak status, a 10-second reflect, tomorrow's first item.

This converts "86 apps I might open" into "one ritual I do daily that surfaces the rest," and it's
the **destination every proactive nudge deep-links into.**

> **Phase 3 is specced build-ready** in [app-plans/spine-phase3.md](app-plans/spine-phase3.md) —
> `/today` RSC over `getToday()` + `ensureXp`, severity-grouped `TodayCard`s, morning/evening
> framing, the grid moved to `/apps`, and the pure `pickMode`/`chooseApps`/`groupBySeverity` helpers.

### Layer 4 — The Proactive Spine (the engagement engine)

The reason the product gets used *more*. Same `today()` data, opposite direction: the product
reaches out.

- **Scheduling:** Vercel Cron (`vercel.ts` / `vercel.json crons`) or Supabase `pg_cron` → a
  `/api/cron/digest` route runs per user on their local-time schedule.
- **Channels:** **email first** (cheapest path to value — a provider such as Resend, sending from
  `cubemetrics.com`). **Web push second** (PWA manifest + service worker + VAPID keys +
  `push_subscriptions` table).
- **Triggers (all earned, never manufactured):**
  - **Morning digest** — "here's your day" (the dashboard, *delivered*).
  - **Evening close-out** — nudge to close the day / log what's missing.
  - **Due-item nudges** — bills, medication, plant watering, a contact past its keepintouch cadence,
    a budget at 80% with 10 days left. *The data already exists; nothing surfaces it today.*
  - **Streak-save** — "you're about to break a 12-day streak." `ensureXp` already computes the
    streak; this is the single highest-ROI nudge and the cheapest to ship (no new reads).
- **Prefs:** `notification_prefs(user_id, channel, morning_time, evening_time, enabled flags,
  quiet_hours, tz)` — owner-only RLS.
- **Discipline (a one-way door):** nudges must be useful or users mute permanently and the channel
  dies forever. No "we miss you!" noise. Respect tz + quiet hours. One-tap mute per trigger.

> **Phase 4 is specced build-ready** in [app-plans/spine-phase4.md](app-plans/spine-phase4.md) —
> Vercel Cron → `/api/cron/digest` (every 30 min, per-user local-time selection), opt-in
> `notification_prefs` + idempotent `notification_log` (claim-before-send), the `shouldSend` trust
> gate, Resend email + HMAC unsubscribe, and the `isDue`/`shouldSend`/`streakAtRisk` test surface.

### Layer 5 — AI nudges over `today()`

A capped, cached Haiku pass (AI Gateway) over the aggregated day produces **one** contextual line for
the digest / `/today` header: "3 workouts this week — one more hits your goal," "you've opened budget
5 days running, pin it?" Variable, contextual reward — the delight that makes a notification worth
opening instead of muting. Strictly additive; never blocks a surface if the model call fails.

> **Phase 5 is specced build-ready** in [app-plans/spine-phase5.md](app-plans/spine-phase5.md) —
> `getNudge()` over the AI Gateway (`"anthropic/claude-haiku-4-5"`), the `ai_nudges` day-cache, a
> deterministic `fallbackLine` (ships without AI), progressive non-blocking `/today` render, and a
> global kill switch + per-user opt-out.

### Layer 6 — Curated cross-app links

Formalize a **handful** of high-value joins (not 86×86): capture→inbox triage, recipe→mealplan→
grocery, expense→budget, task→project/goal, contact→keepintouch. Several already exist ad hoc
(inbox→todos, networth→savings/debt, mealplanner→recipes); this makes them first-class. Ongoing.

## 4. Re-sequenced phases

Every phase builds toward **Phase 4, the engagement engine.**

| Phase | Build | Why here |
|------:|-------|----------|
| **1** | **Substrate** — `spine/` registry + `today()`/`quickLog()` contract; `app_usage` + `bumpUsage`; generalize `ensureXp` fan-out into `getToday()`. Wire ~6 high-signal apps as the proof set (todo, habits, budget, water, journal, bills). | Required by everything; nothing ships without it. |
| **2** | **Capture** — global `<QuickCapture>` bar → `quickLog` routing (structured v1). | Reduces input friction → more data for every downstream surface; standalone win; plumbing reused by Phase 4. |
| **3** | **Today anchor ritual** — `/today` morning/evening flow over `getToday()` + XP; grid → `/apps` (usage-ordered). | The active destination that nudges land on; proves `today()` end-to-end. |
| **4** | **Proactive spine** — Vercel/pg cron + email digest + due-nudges + **streak-save**; `notification_prefs`. | The engagement engine. Now there's data (2), a destination (3), and substrate (1) to push about. |
| **5** | **AI nudges** over `today()` via AI Gateway. | Delight on the now-live channel. |
| **6** | **Cross-app links** — formalize the curated joins. | Opportunistic, ongoing. |

**Cheapest first nudge:** streak-save (Phase 4) needs only the existing `ensureXp` streak — ship it
as the Phase-4 MVP before the full digest.

> **Phase 1 is specced build-ready** in [app-plans/spine-phase1.md](app-plans/spine-phase1.md) —
> exact schemas, the `src/lib/spine/` layout, the 6 proof adapters, the `app_usage` migration, and
> the test list.

## 5. Governance — the rule that keeps the spine ahead of breadth

Make "spine-first" concrete: **every new app must ship a Layer-0 adapter (`today` and, if loggable,
`quickLog`) — or explicitly justify opting out — decided in its app-plan *before* it's built.** Bake
this into `.claude/roles/builder.md` and the app-plan template. New breadth then *strengthens* the
spine by construction instead of diluting it.

## 6. Risks & open decisions

- **New infra is the real cost.** Cron + email + web-push are surfaces the app doesn't have yet.
  Sequencing email-first keeps the Phase-4 MVP small; web push is a fast-follow.
- **Email deliverability** — sending domain on `cubemetrics.com` (SPF/DKIM via the provider).
- **Privacy** — digests carry personal data: signed per-user unsubscribe/links, no public caching,
  honor `force-dynamic` discipline.
- **Trust is a one-way door** — over-notifying trains permanent mutes. Bias toward fewer, earned
  nudges; make muting trivial and per-trigger.
- **Single- vs multi-user** — proactive + earned nudges pay off either way. Social/accountability
  and shareable streak/recaps are deferred; they only unlock if there's ever more than one user.
- **`SpineToday`/`TodayItem` shape — ✅ RESOLVED** (finalized 2026-05-31; see §7 + Phase 1 §2).
- **Still open** (consolidated in §7): cron host (Vercel Pro vs Supabase `pg_cron`); Today-as-home
  routing churn; email opt-in default; ship Phase 5 `fallbackLine`-only vs wire the model now.

## 7. Build order & kickoff (capstone)

All five core phases are specced (`spine-phase1..5.md`); Layer 6 (cross-app links) stays opportunistic.
This section is the single kickoff reference: dependencies, what's island-safe, the shared-file
collision points, and the decisions to settle **before** building.

### Dependency graph
```
Phase 1 (substrate) ──┬─→ Phase 2 (capture)
                      ├─→ Phase 3 (Today) ──→ Phase 4 (proactive) ──→ Phase 5 (AI nudges)
                      │                              ▲
                      └──────────────────────────────┘  (P4 reads getToday + ensureXp)
```
**Critical path:** 1 → 3 → 4. Phase 2 hangs off 1 and can land in parallel with 3. Phase 5 layers onto
3/4 and is the most cuttable (its `fallbackLine` needs no AI). The contract (`SpineToday`) is
**finalized**, so 2–5 build against a frozen interface — no re-opening adapters.

### Per-phase build profile
| Phase | Depends on | New infra / deps | Shared-file edits (collision points) | Island-safe? | Size |
|------:|-----------|------------------|--------------------------------------|:---:|:----:|
| **1** Substrate | — | `app_usage` migration; spine registry generator | `package.json` (scripts), factory `[id]/page.tsx`, 4 custom proof pages | mostly (1 lane) | M |
| **2** Capture | 1 | — | `Shell.tsx` (1 line) | yes | S–M |
| **3** Today | 1 (+2 ideal) | — | **43 back-link edits**, `page.tsx`→`/apps` move | no (touches many pages) | M |
| **4** Proactive | 1, 3 | Cron host, `resend` dep, **DNS SPF/DKIM**, secrets | `vercel.ts` (new), `notifications` catalog entry, `database.md` | mostly | **L** |
| **5** AI nudges | 3 (4 opt.) | `ai`+`zod` deps, AI Gateway key | `TodayHeader` (P3), `digest.ts` (P4), `notification_prefs` (+1 col) | mostly | S–M |

Phases 1, 2, 4, 5 are clean single-lane / single-PR units. **Phase 3 is the churny one** (the
grid move + 43 back-links) — keep it its own focused PR, not bundled.

### Decisions to settle before building (and who they gate)
1. **Cron host — gates Phase 4.** Vercel **Pro** (sub-daily cron) vs Supabase **`pg_cron`+`pg_net`**.
   *Recommend:* confirm the Vercel plan; if Hobby, use `pg_cron`. Route logic is identical either way.
2. **Today-as-home routing — gates Phase 3.** Recommended: `/`→`/today`, grid→`/apps`, 43 back-link
   edits. Lower-churn alt (keep grid at `/`, add `/today`) in Phase 3 §9. *Pick before starting P3.*
3. **Email opt-in default — gates Phase 4.** *Recommend* `email_enabled=false` (consent +
   deliverability), owner-enabled-first to dogfood.
4. **Phase 5 depth.** Ship `fallbackLine`-only first (no `ai`/`zod`) and wire the model later behind
   `AI_NUDGES_ENABLED`, or do the model now. *Recommend* fallback-first.
5. **Ops prerequisite (Phase 4):** verify `cubemetrics.com` in the email provider + add SPF/DKIM on
   **NameSilo** — a real setup task gating real delivery, independent of code.

### Recommended kickoff
**Start with Phase 1** — it's island-safe, the smallest unblock, and everything depends on it. It can
go as one focused PR or a single `parallel-build` lane (its files are disjoint). Land it, then 2 and 3
can proceed (2 in parallel; 3 as its own PR once routing is decided). Each phase's spec doc has its own
test gate and file manifest, so each is an independently shippable unit.

### Governance reminder
Per §5, once Phase 1 lands, **every new app ships a `src/lib/spine/adapters/<id>.ts` (or a justified
opt-out)** — fold this into `.claude/roles/builder.md` and the app-plan template so new breadth feeds
the spine instead of diluting it.

## 8. North star (restated)

Coherent is table stakes. **The spine is finished when XP Boost pulls you back daily on its own** —
the morning it emails you your day, you log three things from the digest, and you never had to
remember which of 86 apps to open.
