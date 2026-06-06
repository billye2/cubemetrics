# Agent Layer — Phase C build checklist (Proactive discovery)

The third island of the [Agent Layer](agent-layer.md): a background pass over the user's own data that
**suggests** layout and entry changes — *"you've opened Budget 5 days running but it's not on your
Today — add it?"*, *"you've logged water every morning — want a daily goal?"* — and lets the user
**accept or dismiss** each one. Suggestions are **earned-only and never silent**: nothing is written
until the user accepts, and accepting routes through the machinery Phases A/B already shipped.

> **Status:** 🟡 SPEC — not built (2026-06-06). Phases A (reshape Today) and B (propose→confirm +
> `agent_actions` undo) are shipped in the `/assistant` surface; this extends them with discovery.
>
> **Scope guard:** Phase C only *surfaces suggestions and acts on the user's acceptance*. The
> detection is **deterministic heuristics in v1** (no LLM); an AI-generated grade is P2. Accepting a
> suggestion reuses existing write paths — it adds **no new write surface**.
>
> **Definition of done:** behind the agent gate + per-user opt-in, the digest cron generates ≤5 pending
> suggestions per user from real signal; a "Suggestions" strip on `/today` shows them with Add/Dismiss;
> accepting a layout suggestion reshapes Today (reuses `today_prefs`), accepting an entry suggestion
> opens `/assistant` with the proposal pre-loaded for confirm; dismissals are sticky (never re-suggested).
> Flags off ⇒ no generation, no strip, zero behavior change. Green `npm test` + `npm run build`.

---

## 0. What already exists (reuse verbatim — do not rebuild)

Grounded in the live code so implementation is mechanical:

- **Background runner:** `src/app/api/cron/digest/route.ts` — `CRON_SECRET`-gated, `maxDuration=300`,
  loops every `notification_prefs` row with `email_enabled=true`, per user computes `tz` → `localDay` →
  `buildSpineCtx` → `app_usage` (top 12) → `chooseApps` → `getToday` + `ensureXp`. **Phase C piggybacks
  this loop** (the day is already assembled here).
- **Trust gate philosophy:** `src/lib/notify/policy.ts::shouldSend` — *"nothing actionable ⇒ send
  nothing."* Phase C mirrors it: *no real signal ⇒ suggest nothing.*
- **Day snapshot:** `src/lib/spine/registry.ts::getToday(ctx, appIds)` → `SpineToday[]`; `REGISTERED_APP_IDS`;
  `src/lib/spine/today-view.ts::{chooseApps, resolveTodayApps}`.
- **Usage signal:** `public.app_usage` (`pinned`, `use_count`, `last_used_at`) — the recency/frequency
  substrate every detector reads.
- **Layout writes (Capability A):** `src/lib/agent/layout.ts` — `applyLayoutTool` + the private
  `savePrefs`/`getPrefs`/`clearTodayPrefs` over `public.today_prefs`. Accepting a layout suggestion
  reuses these (export the helper or add `addTodayApp(appId)` / `hideTodayApp(appId)` wrappers).
- **Entry writes (Capability B):** `src/lib/agent/run.ts` — `Proposal`, `planTool`, `executeProposal`;
  `src/app/assistant/actions.ts::{applyProposals}`; `src/lib/agent/audit.ts::logAgentAction`. Accepting
  an entry suggestion produces a `Proposal` and hands it to the existing confirm flow.
- **AI snapshot (for the P2 AI grade):** `src/lib/ai/nudge-input.ts::buildNudgeInput` + `hashInput`
  already compact the day into a model-safe struct; the suggestion model reuses it.
- **Digest rendering:** `src/lib/notify/digest.ts::buildDigest` (HTML+text, `esc()` everything),
  `email.ts::sendEmail`, `tokens.ts::unsubscribeUrl`. A "Suggestions" section is additive here (P2).

> **The whole point:** detection is the only genuinely new logic. Surfacing reuses the digest + a small
> `/today` strip; acting reuses `today_prefs` (A) and propose→confirm (B). Keep it that way.

---

## 1. Prerequisites & decisions
- [ ] **Gate:** reuse the agent gate. A suggestion is generated only when the user has opted into the
      assistant (today: `ANTHROPIC_API_KEY` present + the user navigates to `/assistant`). Add a
      per-user `suggestions_enabled` opt-in (default **off**, owner-dogfood first) — see §2. Detection
      runs in the **cron** under the **service-role** client, so every query MUST `.eq("user_id", …)`
      (same invariant as the spine adapters).
- [ ] **Detection grade:** ship **deterministic heuristics (v1, P1)**; the **AI-generated grade is P2**
      (behind `AI_NUDGES_ENABLED` + `ai_insights_enabled`, mirroring the Phase-5 nudge line).
- [ ] **Volume cap:** ≤ **5 pending** suggestions per user at any time; generation is idempotent and
      sticky (dismissed/acted suggestions never recur — unique `dedupe_key`).
- [ ] **Cadence:** generate **once per local day** per user, in the morning digest computation (guarded
      by a `notification_log`-style claim or a `last_generated` check), not every 30-min tick.

## 2. Data model (migration)
Timestamp-named per `docs/database.md` (`YYYYMMDDTHHMM_<slug>.sql`); owner-only RLS; the same
owner-`FOR ALL` policy pattern as `today_prefs`/`agent_actions`.

- [ ] `src/supabase/migrations/<ts>_agent_suggestions.sql`:
  ```sql
  create table public.agent_suggestions (
    id          bigint generated always as identity primary key,
    user_id     uuid not null references auth.users(id) on delete cascade,
    kind        text not null,                 -- 'pin' | 'hide' | 'goal' | 'review' (extensible)
    title       text not null,                 -- the human rationale shown to the user
    action      jsonb not null,                -- what "Accept" does (see §4 dispatch)
    dedupe_key  text not null,                 -- stable per (signal, app) — stops re-suggesting
    status      text not null default 'pending', -- 'pending' | 'accepted' | 'dismissed'
    created_at  timestamptz not null default now(),
    acted_at    timestamptz,
    unique (user_id, dedupe_key)               -- sticky: one row per signal ever
  );
  alter table public.agent_suggestions enable row level security;
  create policy "own agent_suggestions" on public.agent_suggestions for all
    using (auth.uid() = user_id) with check (auth.uid() = user_id);
  create index agent_suggestions_user_pending_idx
    on public.agent_suggestions (user_id, status, created_at desc);
  ```
- [ ] `src/supabase/migrations/<ts>_notification_prefs_suggestions.sql`:
  ```sql
  alter table public.notification_prefs
    add column if not exists suggestions_enabled boolean not null default false;
  ```
- [ ] Apply to the project (a builder/owner action — **not** done in the spec-writer role).
- [ ] `docs/database.md`: document `agent_suggestions` + the new column (mirror the `today_prefs` entry).

## 3. Detection — pure heuristics (write tests first; this is the test core)
`src/lib/agent/suggest.ts` → **`detectSuggestions(input): Suggestion[]`**, pure and unit-tested. The
cron assembles `input`; the function holds all the branchy logic (like `today-view.ts`/`policy.ts`).

```ts
export interface SuggestInput {
  usage: { app_id: string; pinned: boolean; use_count: number; last_used_at: string }[];
  prefs: { ordered_app_ids: string[]; hidden_app_ids: string[] } | null; // today_prefs
  shownAppIds: string[];          // resolveTodayApps(prefs, usage, REGISTERED_APP_IDS, 8)
  registered: string[];           // REGISTERED_APP_IDS (adaptered apps)
  today: { appId: string; severity: string }[]; // from getToday
  trackerStreaks: { appId: string; days: number; hasGoal: boolean }[]; // §3.3 input
  todayKey: string;               // local day, for recency math
}
export interface Suggestion { kind: string; title: string; action: SuggestAction; dedupeKey: string; }
```

P1 detectors (each emits at most one suggestion per app; all dedupe-keyed so they never repeat):

- [ ] **3.1 `pin` — surface a frequently-used app that isn't on Today.** App has an adapter, is **not**
      in `shownAppIds`, not hidden, `use_count ≥ 5` (tunable) over the window. → `action = {type:"add_today", appId}`
      (append to `today_prefs.ordered_app_ids`). `dedupeKey = "pin:" + appId`. Title e.g.
      *"You open Budget a lot — add it to Today?"*
- [ ] **3.2 `hide` — retire a dormant card.** App **is** in `shownAppIds` but `last_used_at` older than
      **14 days** (tunable) AND not pinned. → `action = {type:"hide_today", appId}`. `dedupeKey = "hide:" + appId`.
      *Base on usage recency, NOT severity* — presence cards (mood/stress) are "due" daily and must not
      be mistaken for dormant.
- [ ] **3.3 `goal` — propose a goal for a consistently-logged tracker.** A `tracker`/`logbook` app
      logged on ≥ **5 of the last 7 days** with **no** active goal of the matching `goal_type`. →
      `action = {type:"propose_entry", proposal:{tool:"add_goal", appId, …}}`. `dedupeKey = "goal:" + appId`.
      *(Needs the `trackerStreaks` input — §5 fetch.)*

P3 detector (defer): **3.4 `review` — overdue cluster.** `≥ 4` cards `overdue` → suggest a focus line
(`{type:"set_focus", text}`). Borderline (the digest already lists actionable); ship only if dogfood asks.

- [ ] `detectSuggestions` enforces the **≤5 cap** (priority order: goal > pin > hide) and returns
      `[]` when nothing qualifies (earned rule).

## 4. Accept / dismiss — server actions (reuse existing write paths)
`src/app/assistant/actions.ts` (or a new `src/app/today/_suggest/actions.ts`), `"use server"`,
user-session (RLS), each `revalidatePath` as noted:

- [ ] **`acceptSuggestion(id)`** — load the user's pending row, dispatch on `action.type`:
  - `add_today` → append `appId` to `today_prefs.ordered_app_ids` (reuse a `layout.ts` helper) →
    `revalidatePath("/today")`. *(Reversible — it's just layout.)*
  - `hide_today` → add `appId` to `today_prefs.hidden_app_ids` → `revalidatePath("/today")`.
  - `propose_entry` → return the embedded `Proposal` to the client, which opens `/assistant` with it
    pre-loaded into the **existing Confirm checklist** (do NOT auto-write — entries stay propose→confirm).
  Then stamp `status='accepted', acted_at=now()`.
- [ ] **`dismissSuggestion(id)`** — stamp `status='dismissed'`. The unique `dedupe_key` keeps it from
      ever being regenerated.
- [ ] **`pendingSuggestions()`** — the user's `status='pending'` rows, newest first (powers the strip).

## 5. Generation — extend the digest cron (service-role; per the existing loop)
- [ ] `src/lib/agent/suggest.ts` → **`generateSuggestions(admin, userId, ctx, today, usage, prefs)`**:
  fetch the extra inputs the heuristics need (the **tracker-streak** counts: `daily_trackers`/`logs`
  rows grouped by type over the last 7 local days, joined against `goals` for `hasGoal`), build
  `SuggestInput`, run `detectSuggestions`, then **insert pending rows** with
  `upsert(..., { onConflict: "user_id,dedupe_key", ignoreDuplicates: true })` so re-runs and prior
  dismissals never double-insert. Respect the ≤5 pending cap (count existing pending first).
- [ ] Wire into `src/app/api/cron/digest/route.ts`: inside the per-user block, **once per local day**
  (guard with a `notification_log` `kind='suggest'` claim, reusing the unique `(user_id,kind,local_day)`
  index — same claim-before-do pattern as sends), call `generateSuggestions(...)` **only if**
  `prefs.suggestions_enabled`. Best-effort + try/catch — suggestion generation must never break a send.
- [ ] Safe-without-secrets: no `suggestions_enabled` rows ⇒ the block is a no-op (like the dormant
  email path today).

## 6. Surfacing
- [ ] **P1 — `/today` strip.** `src/components/modern/today/TodaySuggestions.tsx` (client, progressive
  like `<TodayInsight>`): fetch `pendingSuggestions()` after mount; render each as a compact row with
  **Add/Hide/Set goal** (per `kind`) + **Dismiss**. Dark/zinc/cyan idiom, 44px targets. Mount in
  `src/app/today/page.tsx` under the header, gated on `suggestions_enabled`. Empty ⇒ render nothing.
- [ ] **P2 — digest email section.** Add an optional "Suggestions" section to `buildDigest` (≤2 items,
  `esc()`'d) with a deep-link `${SITE}/today` (acceptance happens in-app — email can't run an action).
  Keep it earned-only and below the actionable cards.

## 7. Test surface (Vitest; pure-first, mock the model + Supabase)
- [ ] `detectSuggestions`: each detector fires on its signal and is silent without it; the ≤5 cap +
  priority order; dormant-hide ignores severity; goal-detector skips apps that already have a goal;
  empty input ⇒ `[]`.
- [ ] Accept dispatch: `add_today`/`hide_today` issue the expected `today_prefs` write; `propose_entry`
  returns the proposal and does **not** write; dismiss stamps status; all user-scoped (Supabase mocked).
- [ ] Generation: `onConflict ignoreDuplicates` means a dismissed `dedupe_key` is never re-inserted;
  the pending cap is honored.
- [ ] `npm test` + `npm run build` green.

## 8. Safety & governance (inherits [agent-layer.md](agent-layer.md) §8)
- **Never silent.** Suggestions are inert rows; only an explicit Accept writes, and entry-accepts still
  go through propose→confirm. Trust is a one-way door (same logic as the email channel).
- **Earned-only + capped + sticky-dismiss** so the strip/email never become noise.
- **RLS + user-scope**: generation runs service-role in the cron ⇒ every query `.eq("user_id")`;
  accept/dismiss run in the user session.
- **No fabrication / no third-party text** reaches a model (P2 AI grade reuses `buildNudgeInput`, which
  is structural-only — no free-text bodies).

## 9. Phasing within Phase C
| Step | Build | Priority |
|------|-------|----------|
| Heuristic detection (`pin`/`hide`/`goal`) + table + accept/dismiss + `/today` strip | the core loop | **P1** |
| Generation wired into the cron (daily, gated, capped) | makes it proactive | **P1** |
| Digest-email "Suggestions" section | reach beyond the app | P2 |
| AI-generated suggestions (gated, reuses `buildNudgeInput`) | quality grade | P2 |
| `review`/overdue-cluster detector; re-suggest-after-N-days; suggestion analytics | polish | P3 |

## 10. Open questions (decide at build time)
1. **Surface placement** — `/today` strip (recommended; layout suggestions are most contextual there)
   vs. a section in `/assistant`. Could do both; start with `/today`.
2. **Opt-in reuse vs. new flag** — new `suggestions_enabled` (recommended, explicit) vs. folding into
   `ai_insights_enabled`. Keep separate so a user can want insights but not suggestions.
3. **Entry-accept UX** — deep-link to `/assistant` with the proposal pre-loaded (recommended, reuses the
   Confirm checklist) vs. an inline confirm on the `/today` strip. The former avoids a second confirm UI.
4. **Re-suggest policy** — v1 dismissals are permanent (sticky `dedupe_key`). A "snooze N days" variant
   (clear the row after N days) is a P3 nicety.

## File manifest (new / touched)
```
NEW   src/lib/agent/suggest.ts                 (detectSuggestions [pure] + generateSuggestions)
NEW   src/app/today/_suggest/actions.ts        (acceptSuggestion / dismissSuggestion / pendingSuggestions)
NEW   src/components/modern/today/TodaySuggestions.tsx
NEW   src/supabase/migrations/<ts>_agent_suggestions.sql
NEW   src/supabase/migrations/<ts>_notification_prefs_suggestions.sql
EDIT  src/lib/agent/layout.ts                  (export an addTodayApp/hideTodayApp helper for accept)
EDIT  src/app/api/cron/digest/route.ts         (per-user, once/day: generateSuggestions, gated)
EDIT  src/app/today/page.tsx                   (mount the strip, gated)
EDIT  src/lib/notify/digest.ts                 (P2: optional Suggestions section)
EDIT  docs/database.md                         (agent_suggestions + suggestions_enabled)
NEW   tests/unit/agent-suggest.test.ts
```

## Provenance
Extends [[agent-layer]] §6.6 (v2 — "from the data") and §9 Phase C. Builds on the shipped Phase A
(`today_prefs`, `resolveTodayApps`) and Phase B (`Proposal`/`planTool`/`executeProposal`,
`agent_actions`). Reuses `src/lib/notify` (cron, `shouldSend`, `buildDigest`) and `src/lib/ai`
(`buildNudgeInput`). See memory [[project_agent-layer]], [[coherence-dashboard]].
