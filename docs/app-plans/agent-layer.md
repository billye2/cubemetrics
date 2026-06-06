# The Agent Layer (Spine Layer 7)

A plan for making XP Boost **agent-enabled**: a Claude-powered assistant the user talks to in
natural language that (A) **redesigns the `/today` dashboard** around what the user says matters
most, and (B) **makes entries into the relevant mini-apps** based on what it learns about the user.

> **Status:** 🟡 **PROPOSED / NOT BUILT — spec only for now (2026-06-05).** This extends the Spine
> (Layers 0–6, all shipped) with a new Layer 7. It depends on the existing read substrate
> (`getToday()`/`ensureXp()`) and on a new, small write contract. No LLM is wired into the runtime
> today; this is the spec to do it. Recommended first build: **Phase A** (reshape Today). Capability-B
> autonomy is settled as **propose→confirm** (§10).
>
> **North star:** the spine made the product *reach out and bring you back*; the agent makes the
> product *reshape itself to you and do the busywork for you* — you describe your life in plain
> words, and your dashboard and your apps rearrange themselves to match.
>
> **Update 2026-06-06: both capabilities now ship in the +XP assistant.** Capability B (auto-entries)
> is propose→confirm + in-session undo (PR #161). **Capability A (reshape Today)** landed too —
> built **into the +XP assistant chat (text-first)** rather than a separate `/today` Tune panel: live
> layout tools (`set_today_focus`/`set_today_layout`/`hide_today_app`/`show_today_app`/
> `reset_today_layout`) write the new `today_prefs` table; `/today` reads it via `resolveTodayApps`
> (back-compatible). Deviations from the Phase-A spec: no separate Tune panel/route; no extra
> `AGENT_ENABLED`/`agent_enabled` opt-in (the assistant is already an opt-in surface gated by
> `ANTHROPIC_API_KEY`); model stays Haiku via the direct SDK. Voice reshaping is deferred (voice is
> Safari-only); text works everywhere.

---

## 1. "Agent-enabled" — yes, this means the Claude API

Concretely, an agent here = **Claude doing multi-step tool-calling** over a structured snapshot of
the user's day, where the "tools" are a small, allowlisted set of writes into XP Boost's own tables.

Two viable wiring routes; **recommend the AI Gateway** (it's already the documented choice for the
dormant Phase-5 insight line, so we stay on one path):

| Route | How | Env | Notes |
|------|-----|-----|------|
| **Vercel AI Gateway** *(recommended)* | `ai` SDK `generateText({ model: "anthropic/claude-sonnet-4-6", tools, ... })` | `AI_GATEWAY_API_KEY` | Unified provider access, observability, model fallback, zero-data-retention. Same path Phase 5 specced (`docs/app-plans/spine-phase5.md`). Tool-calling + streaming supported. |
| **Direct Anthropic SDK** | `@anthropic-ai/sdk` with the Messages API | `ANTHROPIC_API_KEY` | The repo already holds `ANTHROPIC_API_KEY` — but as a **GitHub Actions** secret for the `@claude` code action (CI only), *not* a runtime/deployment secret. Adding it at runtime is an option but forks us off the gateway path. |

**Dependencies to add:** `ai` + `zod` (Phase 5 already calls for these; this reuses them). The model
is **swappable via an `AGENT_MODEL` env var** (AI Gateway `provider/model` string) so the tier is an
ops decision, not a code change. **Default: `anthropic/claude-haiku-4-5`** — Phase A's job is bounded
(read a compact snapshot → emit 1–3 tool calls), not a long-horizon loop, so Haiku is sufficient and
~3× cheaper than Sonnet / 5× cheaper than Opus. Bump `AGENT_MODEL` to `anthropic/claude-sonnet-4-6`
if dogfooding shows it stumble on many-entry Capability-B turns or vague focus statements. Reliability
on a small model comes from **strict structured outputs** (every tool `strict: true` + zod schema),
not from a bigger model. Note: `effort` is **not** supported on Haiku 4.5 — omit it (it's an Opus/
Sonnet-4.6 parameter); only set `effort` if `AGENT_MODEL` is pointed at Sonnet/Opus.

**Gating (mirror Phase 5's discipline):** a global kill switch `AGENT_ENABLED` + a per-user opt-in
(reuse / extend `notification_prefs`; e.g. `agent_enabled boolean default false`) + the tier knob
`AGENT_MODEL` (default `anthropic/claude-haiku-4-5`; see §1). No key or flag ⇒ the feature is
invisible and the app behaves exactly as today (safe-without-secrets, like the digest).

---

## 2. The thesis: the agent reuses the spine, it does not reinvent it

The spine already built two of the three organs an agent needs. We only need to add the third and
wire them together:

```
SENSES (read)   →   src/lib/spine  ::  getToday(ctx, appIds)   + ensureXp()   + the catalog
                    Already fans out across adapters and normalizes the day. This IS the agent's
                    perception of the user. Reuse verbatim.

HANDS  (write)  →   src/app/app/_factories/actions.ts  (6 generic, RLS-safe template writes)
                    + per-custom-app actions.ts.  These already exist. The gap is a *uniform,
                    allowlisted* way to expose them to a model. That is the only new contract.

BRAIN  (reason) →   src/lib/agent  ::  NEW. A generateText tool-loop that turns "what the user
                    says matters" into reads (senses) and writes (hands), with confirm + undo.
```

Framed this way, Layer 7 is small: **context assembly is a thin wrapper over `getToday`**, the
**write surface mostly already exists**, and the genuinely new code is the tool registry + runtime +
a chat surface + two tiny tables.

> The full set of extension points an agent needs — the per-app contract hooks (act / describe /
> suggest / route) and global surfaces (memory, audit/undo, events, guard) — is catalogued and
> prioritized in **[agent-hooks.md](agent-hooks.md)**.

---

## 3. What exists today (grounded) — and the gaps

### Read side — ready to reuse
- `src/lib/spine/registry.ts` → `getToday(ctx, appIds?)`: parallel `today()` fan-out, error-isolated.
- `src/lib/spine/types.ts` → `SpineCtx { supabase, userId, tz, now }`, `SpineToday`, `TodayItem`.
- `src/lib/ai/nudge-input.ts` → `buildNudgeInput(today, xp, mode)`: already compacts the day into a
  **model-safe struct** + `hashInput()` for caching. The agent's context builder should extend this,
  not duplicate it.
- `src/lib/xp/compute.ts` → `ensureXp()` (streak, level, quests, today's points).
- `src/lib/modern/catalog` → `getApp(id)`, `getAppsByCategory()`, `CATEGORIES`: the full menu of
  apps the agent can talk about, route to, and create entries in.

### Write side — mostly already there
- **Template apps** (`tracker`/`checklist`/`logbook`/`goal`/`finance`/`schedule` — the bulk of the
  ~87 apps) all write through **six generic server actions** in
  `src/app/app/_factories/actions.ts`: `trackerAddAction`, `checklistAddAction`, `logbookAddAction`,
  `goalAddAction`, `financeAddAction`, `scheduleAddAction`. Each takes `(appId, <type>, ...payload)`
  and inserts into a shared table (`daily_trackers`, `checklists`, `logs`, `goals`,
  `finance_items`, `schedule_items`) with a `*_type` discriminator that comes from the app's
  catalog `config`. **Consequence: the agent can write to *any* template app it knows the catalog
  config for — no per-app code.** This is the single biggest accelerator in this whole plan.
- **Custom apps** (`todo`, `journal`, `habits`, …) each have their own `src/app/app/<id>/actions.ts`.
- All writes use `createServerSupabase()` (the **user's session**) and are RLS-scoped
  (`.eq("user_id", userId)`). The interactive agent must run the same way — **not** service-role.

### Gaps the agent needs filled
1. **No uniform write contract for a model.** The 6+N actions exist but aren't described to an LLM
   (names, JSON schemas, allowlist). Layer 7 adds an **agent tool registry** over them.
2. **No per-user Today layout model.** `/today` selects cards purely from `app_usage` (pinned via
   `toggleFavorite` → `app_usage.pinned`, then recency, cap 8) and orders sections by a **hardcoded**
   mode switch (`src/app/today/page.tsx`, `src/lib/spine/today-view.ts::chooseApps/groupBySeverity`).
   There is **nowhere for an agent's "redesign" to land.** Capability A needs a small `today_prefs`
   table + an override hook in card selection. (Pinning already gives the agent one cheap lever.)
3. **No LLM runtime, deps, or surface.** No `ai`/`zod`, no chat UI, no `src/lib/agent/`.
4. **Read reach is narrow.** Only **6 adapters** exist (`bills, budget, habits, journal, todo,
   water`), so only 6 apps feed the agent's *perception* and appear on Today. Write reach (templates)
   is already wide; **read reach grows only as adapter coverage grows** — which is exactly the spine
   governance flywheel (§9).

> **Doc-drift note (worth fixing separately):** `docs/spine.md` §Layer 0 still documents
> `quickLog?`/`match?` on `SpineAdapter` and a Layer-2 `<QuickCapture>` bar. Neither exists in the
> live code (`types.ts` has only `appId` + `today()`; memory records "Quick Capture removed" in the
> 2026-06-01 overhaul). The agent's write hook (§6.3) is the *right* place to revive that idea — but
> `spine.md` should be corrected to match reality regardless of this plan.

---

## 4. The two capabilities, precisely

### Capability A — "Redesign my Today around what matters to me"
The user says, e.g., *"Right now I care about my fitness, staying hydrated, and not missing bills —
hide the journaling stuff for now."* The agent:
1. Reads the current day (`getToday`) + the catalog to know what's available.
2. Persists a **focus statement** and an **explicit Today layout** (order + hide) to `today_prefs`.
3. Optionally pins/unpins apps (`app_usage.pinned`, the existing lever).
4. `/today` then renders that explicit layout instead of the usage-derived default.

These changes are **trivially reversible** (it's just ordering/visibility), so Capability A can run
with **live tools** and a one-tap "revert to automatic."

### Capability B — "Make the entries for me"
From what the user tells the agent (or from patterns it notices in their data), it creates entries in
the relevant apps: *"I drank two glasses just now and I want to start a 20-min reading habit"* →
log water `+2`, create a `habits` row "Read 20 min". Because creating data is **not** trivially
reversible and risks duplicates/garbage, Capability B is **propose → confirm → apply** in v1: the
agent returns a **plan** of proposed writes, the UI shows them as a checklist, the user approves, and
only then do the writes execute (and land in an **undo log**).

---

## 5. Surface — a "Tune" chat panel on `/today`

- A slide-over panel on `/today` (button in `TodayHeader`, e.g. "✦ Tune"), phone-first, 44px targets,
  reusing the dark/zinc/cyan idiom. Not a new top-level route in v1 — the agent's whole job is to
  reshape *this* page, so it lives on it.
- A `"use server"` action streams the agent turn (the `ai` SDK supports streaming tool-calls). The
  panel shows: the assistant's text, any **layout changes already applied** (Capability A, live), and
  a **proposed-entries checklist** with an **Apply** button (Capability B, confirm-gated).
- After Apply, `revalidatePath("/today")` so the reshaped board + new entries appear immediately
  (consistent with the app's `force-dynamic` + revalidate discipline).
- Conversation persistence is **optional in v1** (see §10 decision 4) — a stateless single-turn or
  short ephemeral thread is enough to ship; `agent_threads`/`agent_messages` can come later.

---

## 6. Architecture

```
src/lib/agent/
  context.ts     — assembleAgentContext(ctx): reuses getToday + ensureXp + catalog → a compact,
                   model-safe snapshot (extends buildNudgeInput). The agent's "senses".
  tools/
    layout.ts    — Capability A tools (live): set_today_layout, set_focus, pin_app, unpin_app, hide_app
    entries.ts   — Capability B tools (plan-mode): log_tracker, add_checklist_item, add_log,
                   add_goal, add_finance_item, add_schedule_item, add_todo, create_habit, …
    registry.ts  — GENERATED manifest of all tool specs (one-file-per-app for app-specific ones,
                   collision-free like catalog/spine). Maps each tool → {zod schema, handler}.
  run.ts         — runAgentTurn(input, mode): the generateText tool-loop (system prompt + tools +
                   stopWhen). Returns { text, appliedLayoutChanges, proposedEntries }.
  apply.ts       — applyEntries(planIds): executes confirmed Capability-B writes, logs to agent_actions.
  undo.ts        — undoAgentAction(id): allowlisted revert (mirrors the old CAPTURE_TABLES idea).
  guard.ts       — AGENT_ENABLED + per-user opt-in + rate/cost caps; fail-closed.
src/app/today/_agent/   — the chat panel client component + its server action.
```

### 6.1 Runtime & provider
- `runAgentTurn` = `generateText({ model, system, messages, tools, stopWhen: stepCountIs(N) })` via
  the AI Gateway. `N` (max tool steps) capped low (e.g. 6) to bound cost and runaway loops.
- Model: `process.env.AGENT_MODEL ?? "anthropic/claude-haiku-4-5"` (swappable; see §1). `maxOutputTokens`
  bounded. `abortSignal` timeout. Pass `effort` only when `AGENT_MODEL` is a Sonnet/Opus model — Haiku rejects it.
- Runs in the **user's Supabase session** (RLS-enforced). Never service-role.
- All gated by `guard.ts`; any failure (no key, flag off, over cap) ⇒ graceful "agent unavailable",
  never an error surface. The rest of `/today` is unaffected.

### 6.2 The agent's senses — `assembleAgentContext`
Reuse, don't rebuild. Produce one JSON object containing:
- The compacted day: extend `buildNudgeInput(today, xp, mode)` (already model-safe).
- The user's **current** Today layout + focus (from `today_prefs`) and pins (from `app_usage`).
- A **catalog digest**: for each app the agent may touch — `id`, `name`, `category`, `ui` type, and
  (for template apps) the `*_type` + units/targets from `config` — so the model knows what it can
  reorder and what it can write to, and in what shape. Cap to the user's relevant/used apps to keep
  the prompt small; never dump all 87 verbatim.
- **Never** raw third-party text or another user's data (RLS guarantees the latter).

### 6.3 The agent's hands — the tool registry
Each tool is a typed, validated, RLS-scoped, **auditable** operation backed by an existing action:

```ts
// illustrative shape, src/lib/agent/tools/registry.ts
interface AgentTool {
  name: string;                       // model-facing, e.g. "log_tracker"
  description: string;                // when to use it
  schema: z.ZodTypeAny;               // validated args (the model can't write raw SQL)
  mode: "live" | "plan";             // live = apply now (layout); plan = queue for confirm (entries)
  handler(ctx: SpineCtx, args): Promise<AgentActionResult>;  // calls the existing server action
}
```

- **Template writes need almost no new code:** a single `log_tracker(appId, value, note)` /
  `add_goal(appId, title, target, unit, due)` etc. derives the `*_type` from `getApp(appId).config`
  and calls the existing `_factories/actions.ts` function. Six tools cover the whole template fleet.
- **Custom-app writes** (`add_todo`, `create_habit`, `add_journal_entry`, …) wrap each custom
  `actions.ts`. To stay collision-free and **governed exactly like the spine/catalog**, these live
  one-file-per-app and are assembled by a generator (`npm run build:agent-tools` → generated
  manifest, never hand-edited) — the same pattern as `build:spine`/`build:catalog`.
- **Allowlist by construction:** the model can only ever invoke registered tools; there is no
  free-form write path. This is the structural successor to the removed `CAPTURE_TABLES` allowlist.
- Every executed write is recorded in `agent_actions` with an **undo handle** `{ table, id }`
  (reviving `QuickLogResult.undo`), enabling per-action revert.

### 6.4 Capability A — reshape Today (live)
- New table `today_prefs` (§7) holds `focus`, `ordered_app_ids`, `hidden_app_ids`, `updated_by`.
- New pure helper `resolveTodayApps(prefs, usage, registered, cap)` in `today-view.ts`:
  *if `ordered_app_ids` is non-empty → use it (minus `hidden_app_ids`), filtered to apps that have an
  adapter; else fall back to the existing `chooseApps(usage, …)`.* `src/app/today/page.tsx` calls the
  resolver instead of `chooseApps` directly. Backward-compatible: empty prefs ⇒ today's behavior.
- Tools: `set_today_layout(orderedAppIds[])`, `hide_app(appId)`, `set_focus(text)`, `pin_app`/
  `unpin_app` (reuse `toggleFavorite`). All `mode: "live"`, all reversible; panel offers "revert to
  automatic" (clear `today_prefs`).
- `focus` is reused downstream: inject it into the Phase-5 nudge system prompt and show it on the
  Today header — so "what matters to me" colors every surface, not just card order.

### 6.5 Capability B — auto-entries (propose → confirm → apply)
1. `runAgentTurn` collects `entries` tools in **plan mode**: calling them returns a "queued" result
   and appends a structured proposal `{ tool, appId, label, args }` rather than writing.
2. The panel renders proposals as a checklist; the user unchecks any and taps **Apply**.
3. `applyEntries(planIds)` runs the *same* handlers in execute mode, inside the user session, writing
   to `agent_actions` (with undo handle) per row, then `revalidatePath("/today")`.
4. **Dedup guard:** before applying, each handler checks for an obvious same-day/same-key duplicate
   (e.g. don't create a second identical habit) and skips with a note, so re-running is idempotent.
5. **Undo:** an "Agent did N things — undo" affordance calls `undoAgentAction(id)` (allowlisted
   table revert, user-scoped delete).

> Low-risk, high-frequency logs (e.g. `log_tracker`) *may* later graduate to live auto-apply once the
> confirm flow has earned trust — but v1 confirms everything in Capability B. Trust is a one-way door.

### 6.6 "Discovers things about the user"
Two grades, ship the first:
- **v1 — from the conversation:** the agent extracts intents/entries from what the user *tells* it in
  the panel. Deterministic-ish, in-session, fully consented.
- **v2 — from the data (proactive):** a background pass (could ride the existing
  `/api/cron/digest` infra, Layer 4) notices patterns ("opened budget 5 days running but it's not
  pinned"; "logged water every morning — want a goal?") and surfaces *suggestions* in the next
  digest/Today, never silent writes. This reuses the notify selection/trust machinery and stays
  earned-only. Defer to a later phase (§9 Phase C).

---

## 7. Data-model changes (migrations)

Two small tables; both owner-only RLS, timestamp-named per `docs/database.md`.

```sql
-- today_prefs: the agent-writable Today layout override (Capability A)
create table public.today_prefs (
  user_id        uuid primary key references auth.users(id) on delete cascade,
  focus          text,                              -- the user's stated "what matters most"
  ordered_app_ids text[] not null default '{}',     -- explicit order; empty ⇒ fall back to usage
  hidden_app_ids  text[] not null default '{}',
  updated_by     text   not null default 'user',    -- 'user' | 'agent' (provenance for the UI)
  updated_at     timestamptz not null default now()
);
alter table public.today_prefs enable row level security;
create policy "own today_prefs" on public.today_prefs for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- agent_actions: audit + undo log for every executed agent write (Capability B)
create table public.agent_actions (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  tool        text not null,                        -- e.g. "create_habit"
  args        jsonb not null,
  undo_table  text,                                 -- allowlisted target for revert
  undo_id     bigint,                               -- inserted row id
  created_at  timestamptz not null default now(),
  undone_at   timestamptz
);
alter table public.agent_actions enable row level security;
create policy "own agent_actions" on public.agent_actions for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

- Reuse `notification_prefs` for the per-user opt-in (`agent_enabled boolean default false`) rather
  than a third table.
- `agent_threads`/`agent_messages` are **optional / deferred** (only if v1 persists conversation).

---

## 8. Safety & governance

- **RLS everywhere, user session always.** The interactive agent uses `createServerSupabase()`; RLS
  is the backstop even if a tool handler forgets a `.eq("user_id", …)`. Never service-role here.
- **Allowlisted tools only.** No raw SQL, no arbitrary table writes; the registry *is* the boundary.
- **Confirm before creating data** (Capability B). Layout changes are live but reversible.
- **Undo log** for every write; allowlisted revert.
- **Cost / abuse caps:** max tool-steps per turn, max turns per user per day, `maxOutputTokens`,
  request timeout. Global `AGENT_ENABLED` kill switch + per-user opt-in (default off, owner-first to
  dogfood — same posture as the email digest).
- **Prompt-injection awareness:** v1 reads only the user's *own* structured data (low risk). The day
  any app ingests external/third-party text (an inbox, pasted content) and that text reaches the
  agent's context, treat it as untrusted: never let it expand the tool allowlist or trigger writes
  without the existing confirm gate. Note it now so it isn't forgotten when reach grows.
- **No fabrication.** System prompt: only act on what the user said or what's in the provided
  snapshot; never invent quantities, never log data the user didn't indicate.
- **Privacy / no caching.** The panel + its action are `force-dynamic`, auth-aware, never cached.
  If a transcript is ever sent off-platform, the AI Gateway's zero-data-retention path is the reason
  to prefer it.

---

## 9. Phasing

| Phase | Build | Risk | Depends on |
|------:|-------|------|-----------|
| **A — Reshape Today** | `src/lib/agent/` runtime + context + **layout tools** (live); `today_prefs` table + `resolveTodayApps`; the Tune panel; `ai`+`zod`; gateway wiring + flags. | Low (reversible writes) | Existing read substrate |
| **B — Auto-entries** | **entries tools** (plan mode) + generated tool registry over template + custom actions; `agent_actions` audit/undo; propose→confirm→apply UI; dedup guards. | Medium (creates data; mitigated by confirm + undo) | Phase A |
| **C — Proactive discovery** | background pass over the day that *suggests* layout/entry changes via the digest/Today (earned-only), reusing `src/lib/notify` selection + trust gate. → **build checklist: [agent-phase-c.md](agent-phase-c.md)** | Medium | Phases A/B + provisioned notify infra |
| **D — Dashboard archive** | retrieve-before-generate: match the user's needs to an archive of layouts and load the best instantly; agent stitches + archives on a miss. **Ship curated-presets-first** (works at any scale); the crowd-sourced archive is the scale evolution. → [agent-phase-d-dashboard-archive.md](agent-phase-d-dashboard-archive.md) | Low (curated) / Med (crowd) | Phase A (`today_prefs`); crowd version needs a user base |

**Start with Phase A.** It's the smallest island, the writes are reversible, and it proves the whole
loop (talk → senses → tool-call → persisted reshape → re-render) end to end before any data is
created. Ship it behind `AGENT_ENABLED`, owner-only, and dogfood. → **Build checklist:
[agent-phase-a.md](agent-phase-a.md).**

**Governance flywheel (extends spine §5):** the agent's *reach* = adapter + tool coverage. Make it a
rule that a new app's adapter SHOULD also expose its agent write tool(s) (or justify opting out) in
its app-plan — fold into `.claude/roles/builder.md` and the app-plan template. The agent gives teams
a concrete reason to write adapters that were previously optional: an app without an adapter is
invisible to Today *and* to the agent; an app with one gets both for free. New breadth strengthens
the agent by construction.

---

## 10. Decisions

**Settled (2026-06-05):**
- ✅ **Autonomy for Capability B — propose→confirm. SHIPPED 2026-06-06 in the +XP assistant.** Tool
  calls run in **plan mode** (`planTool` validates/resolves but never writes); the turn returns
  `proposals`, the `/assistant` chat shows them as a Confirm checklist, and only `applyProposals`
  (user-confirmed) executes via `executeProposal`. Each applied entry carries an **in-session undo
  handle** (`{kind:"row",table,id}` or a counter delta) that `undoEntry` reverts — allowlisted tables
  (`INSERT_TABLES`) + user-scoped. **The persistent `agent_actions` audit log SHIPPED 2026-06-06**
  (migration `20260606T0900`, applied to prod): every applied write is logged with its undo handle, so
  undo is now **server-authoritative** (the client passes back only the row id — `undoActionById` looks
  up the handle, reverts, stamps `undone_at`) and works **across sessions** (the assistant loads recent
  un-undone rows on mount via `recentAgentActions` → a "Recent entries" panel). `src/lib/agent/audit.ts`.
- ✅ **v1 disposition — spec only for now.** This document is the plan; no build is scheduled yet.
  Phase A (reshape Today) remains the recommended first build whenever it kicks off.
- ✅ **Model — swappable, default Haiku 4.5 (2026-06-06).** The model is an `AGENT_MODEL` env var (AI
  Gateway `provider/model` string), default `anthropic/claude-haiku-4-5`. Phase A's tool loop is
  bounded (read a compact snapshot → emit 1–3 tool calls), so Haiku is sufficient at ~3× lower cost
  than Sonnet / 5× lower than Opus; **strict structured outputs** (every tool `strict: true` + zod
  schema), not a bigger model, carry reliability. Bump the env var to `anthropic/claude-sonnet-4-6`
  if eval shows it stumble on many-entry Capability-B turns or vague focus statements — no code
  change. `effort` is unsupported on Haiku 4.5; only set it when `AGENT_MODEL` points at Sonnet/Opus.

**Still open (yours to make at build time):**
4. **Conversation persistence.** Recommend **ephemeral/stateless v1** (no `agent_threads`); add
   persistence if multi-turn memory proves valuable.
5. **Surface placement.** Recommend a **slide-over panel on `/today`** (the thing it reshapes). (Alt:
   a dedicated `/today/agent` route, or a global ⌘K-style bar like the removed QuickCapture.)
6. **Provider.** Recommend **AI Gateway** (one path with Phase 5). (Alt: direct Anthropic SDK reusing
   an `ANTHROPIC_API_KEY` at runtime.)

## 11. Risks
- **Adapter coverage gates read reach** — Capability A only reshapes apps that have adapters (6
  today). Broaden coverage in parallel, or Capability A feels thin. (Write reach via templates is
  already wide.)
- **Cost** — interactive Sonnet tool-loops are pricier than the Haiku nudge. Caps + opt-in + kill
  switch contain it; monitor.
- **Trust** — a bad auto-entry or a dashboard the user didn't want trains permanent distrust. Confirm
  + undo + "revert to automatic" are non-negotiable. Same one-way-door logic as the notify channel.
- **Doc drift** — `spine.md`'s `quickLog`/capture description is stale (§3); correct it so future
  work doesn't build on a contract that isn't there.

## 12. Test surface (pure-first, mock the model)
- `resolveTodayApps`: prefs override vs usage fallback; hidden filtering; cap; non-adapter filtering.
- Each tool's zod schema: rejects malformed args; template `*_type` derivation from catalog config.
- Plan→apply: proposals don't write; apply writes exactly the confirmed set; dedup skips duplicates.
- `undoAgentAction`: only allowlisted tables; user-scoped; idempotent.
- `guard`: flag off / no key / over-cap ⇒ graceful unavailable, never throws into the page.
- `run.ts`: model mocked — assert tool dispatch, step cap, and that layout tools apply while entry
  tools only queue.

## 13. File manifest (new)
```
src/lib/agent/{context,run,apply,undo,guard}.ts
src/lib/agent/tools/{layout,entries,registry}.ts  (registry generated; one-file-per-app for custom)
src/app/today/_agent/<panel>.tsx + its server action
src/app/today/page.tsx            — swap chooseApps → resolveTodayApps
src/lib/spine/today-view.ts       — add resolveTodayApps (pure)
src/supabase/migrations/<ts>_today_prefs.sql
src/supabase/migrations/<ts>_agent_actions.sql
src/supabase/migrations/<ts>_notification_prefs_agent_enabled.sql
package.json                      — add ai, zod; build:agent-tools script
scripts/build-agent-tools.mjs     — generator (mirrors build-spine-registry.mjs)
docs/database.md, docs/environment.md, docs/spine.md  — document the layer + correct the drift
```
