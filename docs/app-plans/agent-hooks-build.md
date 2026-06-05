# Agent Hooks — Build Specs (1–9)

Build-ready specs for the nine agent affordance hooks catalogued in [agent-hooks.md](agent-hooks.md).
Each numbered section is **self-contained and issue-sized** — drop it into the feedback→`@claude`
pipeline (or a `parallel-build` lane) as one PR. Read the **Foundation** and **lane map** first: they
prevent collisions and set build order.

> Substrate, not the agent. These hooks are the contracts/stores the [Agent Layer](agent-layer.md)
> rides on; most are independently buildable and testable **without the runtime existing yet** (e.g.
> `app_events` and `user_facts` ship and unit-test on their own). The consumers (runtime `run.ts`, the
> Tune panel) are [Phase A/B](agent-phase-a.md).

## Lane map & build order
```
Foundation (types + agent dir + generator) ── single lane, FIRST (edits the collision point once)
   │
   ├─ P1 core (parallel after Foundation):  1 Act · 2 Memory · 3 Govern · 4 Undo
   ├─ P2 (after their dep):                  5 Describe (needs 1) · 6 Context · 7 Events
   └─ P3 (gated on a consumer):              8 Suggest · 9 Route
```
**Collision points — coordinate these explicitly:**
| File | Touched by | Rule |
|------|-----------|------|
| `src/lib/spine/types.ts` | Foundation only | Foundation lands ALL new optional adapter members at once; no other lane edits it. |
| `src/app/app/_factories/actions.ts` | 1 (reads), 7 (emits events) | Hook 7 owns the edits; Hook 1 only *calls* these actions. |
| `src/app/today/page.tsx` | 2, Phase A | Whoever lands first wires `resolveTodayApps`; the other rebases. |
| `notification_prefs` (migration) | 3, Phase A | One migration adds `agent_enabled`. |
| `src/lib/notify/digest.ts` | 8 (optional consumer) | Additive only. |

---

## Foundation — contracts, agent dir, generator (single lane, FIRST)
**Goal:** land every new type + the agent package skeleton + the tool-registry generator so the nine
lanes never collide on shared files.

- [ ] **Extend `src/lib/spine/types.ts`** with all new optional adapter members + their contract types
  (adapters implement these, so they live in spine; the runtime imports them):
  ```ts
  export type AgentToolMode = "live" | "plan";
  export interface AgentActionResult { ok: boolean; summary: string; undo?: { table: string; id: number }; }
  export interface AgentTool {
    name: string; description: string; schema: unknown /* a zod schema */;
    mode: AgentToolMode; handler(ctx: SpineCtx, args: unknown): Promise<AgentActionResult>;
  }
  export interface AgentAppContext { appId: string; headline: string; count: number; recent: { label: string; at: string }[]; }
  export interface AppCapability { appId: string; name: string; category: string; verb: string; reads: string[]; writes: string[]; unit?: string; }
  export interface AgentSuggestion { appId: string; kind: string; message: string; href?: string; }

  export interface SpineAdapter {
    appId: string;
    today(ctx: SpineCtx): Promise<SpineToday | null>;            // EXISTS
    tools?: AgentTool[];                                          // Hook 1
    context?(ctx: SpineCtx): Promise<AgentAppContext | null>;     // Hook 6
    describe?(): AppCapability;                                   // Hook 5
    suggest?(ctx: SpineCtx): Promise<AgentSuggestion[]>;          // Hook 8
    match?(input: string): number;                               // Hook 9 (0..1)
  }
  ```
- [ ] **Create `src/lib/agent/`** with `guard.ts` stub + an `index.ts` barrel (Hook 3 fills guard).
- [ ] **Add the generator** `scripts/build-agent-tools.mjs` (clone `scripts/build-spine-registry.mjs`)
  → emits `src/lib/agent/tools/_generated.ts` (`AGENT_TOOLS: AgentTool[]`). Wire `build:agent-tools`
  into `package.json` and the `prebuild`/build chain next to `build:spine`.
- [ ] **Deps:** `npm i ai zod`. **Env (.env.example):** `AGENT_ENABLED=`, reuse `AI_GATEWAY_API_KEY=`.
- [ ] **Tests:** types compile; generator emits an empty-but-valid registry with no adapter tools.

---

## 1 — Act hook (typed per-app writes) · P1
**Goal:** a uniform, allowlisted write surface the model can call; each tool wraps an *existing*
server action. **Depends on:** Foundation.

- [ ] **Template tools (one module, ~6 tools):** `src/lib/agent/tools/_templates.ts` — `log_tracker`,
  `add_checklist_item`, `add_log`, `add_goal`, `add_finance_item`, `add_schedule_item`. Each derives
  the `*_type` from `getApp(appId).config` and calls the matching `_factories/actions.ts` function.
  Return `AgentActionResult` with an `undo` handle (`{ table, id }` of the inserted row).
- [ ] **Custom-app tools, one file per app:** `src/lib/agent/tools/<id>.ts` exporting
  `export const tools: AgentTool[]` — start with `todo` (`add_todo`), `journal` (`add_journal_entry`),
  `habits` (`create_habit`, `check_habit`). Wrap each app's `actions.ts`.
- [ ] **Registry:** `npm run build:agent-tools` assembles `_generated.ts`. The registry is the security
  boundary — no write path exists outside it (successor to the removed `CAPTURE_TABLES` allowlist).
- [ ] **Modes:** layout/log tools `mode:"live"`; create tools `mode:"plan"` (queue for confirm — Phase B).
- [ ] **Invariant:** every handler runs in the user session and filters/writes `user_id = ctx.userId`.
- [ ] **Tests:** each tool's zod schema rejects malformed args; template `*_type` derivation from a
  mock catalog; handler issues the expected insert (Supabase mocked); `undo` handle is populated.

**Files:** NEW `src/lib/agent/tools/{_templates,todo,journal,habits}.ts` (+ generated `_generated.ts`).

---

## 2 — Remember / Preference hook (`today_prefs` + `user_facts`) · P1
**Goal:** durable places for "what to show" and "what matters." **Depends on:** Foundation.

- [ ] **Migration `today_prefs`** (the layout override — see [Phase A](agent-phase-a.md) §2):
  `user_id pk, focus text, ordered_app_ids text[], hidden_app_ids text[], updated_by text, updated_at`.
- [ ] **Migration `user_facts`** — a **typed** KV (avoid a junk drawer; enforce a key allowlist in code):
  ```sql
  create table public.user_facts (
    user_id uuid not null references auth.users(id) on delete cascade,
    key     text not null,          -- allowlisted in FACT_KEYS
    value   jsonb not null,
    source  text not null default 'agent',   -- 'user' | 'agent'
    updated_at timestamptz not null default now(),
    primary key (user_id, key)
  );
  alter table public.user_facts enable row level security;
  create policy "own user_facts" on public.user_facts for all
    using (auth.uid()=user_id) with check (auth.uid()=user_id);
  ```
- [ ] **Pure helper `resolveTodayApps`** in `src/lib/spine/today-view.ts` (explicit layout wins, else
  `chooseApps`; hidden filtered; non-adapter ids dropped). Wire into `src/app/today/page.tsx`.
- [ ] **Fact helpers** `src/lib/agent/facts.ts`: `FACT_KEYS` allowlist (`focus_areas: string[]`,
  `do_not_suggest: string[]`, `cadence_prefs`, `tone`), `getFacts(ctx)`, `setFact(ctx, key, value, source)`
  (rejects keys not in `FACT_KEYS`).
- [ ] **Tests:** `resolveTodayApps` (override vs fallback, hidden, cap, back-compat ≡ `chooseApps`);
  `setFact` rejects unknown keys; round-trips known ones.

**Files:** NEW two migrations, `src/lib/agent/facts.ts`; EDIT `today-view.ts`, `today/page.tsx`.

---

## 3 — Govern hook (guard + caps) · P1
**Goal:** one fail-closed chokepoint every agent entry point calls. **Depends on:** Foundation.

- [ ] **Migration:** `alter table public.notification_prefs add column if not exists agent_enabled boolean not null default false;`
- [ ] **Migration `agent_runs`** (turn log + per-day cap source + observability):
  `id, user_id, started_at, steps int, tokens int, status text` + owner RLS + index `(user_id, started_at)`.
- [ ] **`src/lib/agent/guard.ts`:**
  ```ts
  export function agentAvailable(env, prefs): boolean   // AGENT_ENABLED && AI_GATEWAY_API_KEY && prefs.agent_enabled
  export const CAPS = { maxSteps: 6, maxOutputTokens: 800, maxTurnsPerDay: 50 };
  export async function checkTurnBudget(ctx): Promise<{ ok: boolean; reason?: string }>  // counts agent_runs today
  ```
  All fail-closed (unknown/empty/error ⇒ unavailable), mirroring `isAdmin()`.
- [ ] **Tests:** every off-state (flag off / no key / opt-out / over-cap) ⇒ false; all-on ⇒ true;
  `checkTurnBudget` blocks at the daily cap.

**Files:** NEW migration ×2, `src/lib/agent/guard.ts`.

---

## 4 — Verify / Undo hook (`agent_actions`) · P2
**Goal:** every agent write is auditable and reversible. **Depends on:** Foundation (+ Hook 1 to be useful).

- [ ] **Migration `agent_actions`:** `id, user_id, tool text, args jsonb, undo_table text, undo_id bigint,
  created_at, undone_at` + owner RLS.
- [ ] **`src/lib/agent/undo.ts`:** `recordAgentAction(ctx, { tool, args, undo })` (called by Hook-1
  handlers in execute mode) and `undoAgentAction(ctx, id)` — allowlisted revert via
  `AGENT_UNDO_TABLES` (the set of tables Hook-1 tools write), user-scoped delete, idempotent (stamps
  `undone_at`).
- [ ] **Tests:** revert only allowlisted tables; user-scoped; double-undo is a no-op; non-owner blocked.

**Files:** NEW migration, `src/lib/agent/undo.ts`.

---

## 5 — Describe / Capability hook · P2
**Goal:** machine-readable per-app capability so the agent generalizes over all 94 apps without
hardcoding. **Depends on:** Hook 1 (reads the tool registry) + catalog.

- [ ] **`src/lib/agent/capabilities.ts`:** `describeApp(appId): AppCapability` — derives from
  `getApp(appId)` (name/category/ui/config) + the app's tools in `AGENT_TOOLS` (writes) + adapter
  presence (reads). An adapter may override via its optional `describe?()`.
- [ ] `buildCapabilityManifest(): AppCapability[]` over registered adapters — the digest the agent
  context (Phase A `assembleAgentContext`) injects.
- [ ] **Tests:** snapshot `describeApp` for `todo` (write: add_todo), `water` (read+log, unit glasses),
  a template app (derives `*_type` writes); override path respected.

**Files:** NEW `src/lib/agent/capabilities.ts`. No DB.

---

## 6 — Agent-shaped Perceive hook (`context()`) · P2
**Goal:** a fuller-but-bounded read than the 5-item card, for reasoning. **Depends on:** Foundation.

- [ ] **Adapter `context?(ctx)`** returns `AgentAppContext { appId, headline, count, recent[] }`,
  capped (≤10 recent). Reference impls: `todo` (open count + overdue + next 5 due) and `water`
  (7-day total + today). Keep token-bounded.
- [ ] **`src/lib/agent/perceive.ts`:** `getAgentContext(ctx, appIds)` — fan-out mirroring `getToday`;
  **falls back to summarizing `today()`** when an adapter has no `context()`.
- [ ] **Tests:** fan-out error-isolated; fallback path produces a valid context from `today()`; caps enforced.

**Files:** NEW `src/lib/agent/perceive.ts`; EDIT 1–2 adapters to add `context()` as references.

---

## 7 — Observe / Events hook (`app_events`) · P2
**Goal:** a semantic activity feed for proactive discovery + preset-adoption ranking. **Depends on:**
Foundation. **Owns the `_factories/actions.ts` edits.**

- [ ] **Migration `app_events`:** `id, user_id, app_id text, kind text, ref_id bigint, at timestamptz
  default now()` + owner RLS + index `(user_id, at desc)`. Stores **refs/ids, never content** (privacy).
- [ ] **`src/lib/agent/events.ts`:** `emitEvent(ctx, appId, kind, refId)` (fire-and-forget, throttle-free)
  and `recentEvents(ctx, sinceISO)`. Kinds: `created | completed | logged | deleted`.
- [ ] **Wire emits into the 6 factory actions** (`trackerAddAction`→`logged`, `checklistToggleAction`
  completed→`completed`, `*AddAction`→`created`, `*DeleteAction`→`deleted`). Broad coverage, few files.
  Custom apps (`todo`, `habits`, `journal`) emit from their `actions.ts` as a fast-follow.
- [ ] **Tests:** `emitEvent` writes user-scoped rows; `recentEvents` windows by time; a factory add
  produces exactly one `created` event (action mocked).

**Files:** NEW migration, `src/lib/agent/events.ts`; EDIT `_factories/actions.ts`.

---

## 8 — Suggest hook (`suggest()`) · P3 (gated on a consumer)
**Goal:** per-app proactive nudges feeding the digest + agent. **Depends on:** Foundation; consumer =
`src/lib/notify` (Layer 4) or the agent. Build the hook; wire the consumer only when the channel is live.

- [ ] **Adapter `suggest?(ctx)`** returns `AgentSuggestion[]` — earned-only (reuse the notify trust
  posture: nothing notable ⇒ `[]`). References: `water` ("logged 5 days — set a goal?"), `budget`
  ("opened 5 days running — pin it?"). Respect `user_facts.do_not_suggest`.
- [ ] **`getSuggestions(ctx, appIds)`** fan-out in `src/lib/agent/perceive.ts`.
- [ ] **Consumer wiring (optional, additive):** append top suggestion to `digest.ts` build.
- [ ] **Tests:** earned gate (no signal ⇒ empty); `do_not_suggest` filtering; fan-out isolation.

**Files:** EDIT 1–2 adapters; `src/lib/agent/perceive.ts`; optionally `notify/digest.ts`.

---

## 9 — Route / Match hook (`match()`) · P3 (gated on a capture surface)
**Goal:** route free-text capture to the best app. **Depends on:** Foundation; only useful once a
capture bar exists (the removed QuickCapture). Build pure + tested now; surface later.

- [ ] **Adapter `match?(input): number`** (0..1) + a pure `parse` per app. v1 structured grammar:
  leading token / sigil — `water 2`, `$12 lunch`, `todo call mom`, `mood stressed`. References:
  `water`, `todo`, `budget`.
- [ ] **`src/lib/agent/route.ts`:** `routeCapture(input): { appId, score } | null` — runs every
  `match()`, picks the highest ≥ threshold. Pure.
- [ ] **Tests:** each example routes to the right app; ambiguous/below-threshold ⇒ null; deterministic ties.

**Files:** NEW `src/lib/agent/route.ts`; EDIT 2–3 adapters to add `match()`.

---

## Suggested issue seeding
Each section above = one GitHub issue / PR. Recommended titles + order:
1. `Foundation: agent contracts + tools generator` (blocks all)
2. `Hook 1: Act — typed per-app agent write tools`
3. `Hook 2: Memory — today_prefs + user_facts + resolveTodayApps`
4. `Hook 3: Govern — agent guard + caps`
5. `Hook 4: Undo — agent_actions audit/revert`
6. `Hook 5: Describe — capability manifest` *(after 1)*
7. `Hook 6: Context — agent-shaped reads`
8. `Hook 7: Events — app_events feed` *(owns factory-action edits)*
9. `Hook 8: Suggest — per-app nudges` *(gate on digest)*
10. `Hook 9: Route — capture matching` *(gate on capture bar)*

Per spine governance, every adapter touched here stays one-file-per-app + `npm run build:spine` /
`build:agent-tools`, so lanes 1/5/6/8/9 don't collide even when several add hooks to different
adapters. Land Foundation, then fan out.
