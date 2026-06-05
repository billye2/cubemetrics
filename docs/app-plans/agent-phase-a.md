# Agent Layer — Phase A build checklist (Reshape Today)

The first, smallest island of the [Agent Layer](agent-layer.md): a Claude-powered "Tune" panel on
`/today` that **reshapes the dashboard** from natural language. Layout writes only — all reversible.
No data is created in Phase A (that's Phase B, `propose→confirm`).

> **Scope guard:** Phase A ships **Capability A** (reorder / hide / pin apps + set a focus line) with
> **live, reversible** tools. It deliberately does **not** create entries in any mini-app. Keep the
> tool registry to layout tools; entry tools land in Phase B.
>
> **Definition of done:** behind `AGENT_ENABLED` + per-user opt-in, the owner can open the Tune panel
> on `/today`, say "focus on fitness and bills, hide journaling," and see `/today` re-render with that
> order/visibility persisted — and a one-tap "revert to automatic" clears it. Flags off ⇒ the panel is
> invisible and `/today` behaves exactly as it does today. Green `npm test` + `npm run build`.

---

## 0. Prerequisites & decisions
- [ ] Confirm **AI Gateway** as the provider and **`anthropic/claude-sonnet-4-6`** as the model
      (open decision §10.2 in the parent spec — default to this unless changed).
- [ ] Confirm v1 is **stateless** (no `agent_threads`; each panel turn is independent) — §10.4.
- [ ] Owner-only dogfood: opt-in default **off**; enable for the owner first.

## 1. Dependencies & configuration
- [ ] `npm i ai zod` (both already called for by Phase 5; safe to add now). Confirm `package.json`.
- [ ] Add to `.env.example` (document, leave blank — safe-without-secrets):
  ```bash
  # Agent layer (Phase A). Off unless both are set + the user opts in.
  AGENT_ENABLED=
  # Reuses the Phase-5 gateway key:
  AI_GATEWAY_API_KEY=
  ```
- [ ] `docs/environment.md`: add an "Agent layer" subsection mirroring the AI-nudges entry.

## 2. Data model (migrations)
Timestamp-named per `docs/database.md` (`YYYYMMDDTHHMM_<slug>.sql`); owner-only RLS.

- [ ] `src/supabase/migrations/<ts>_today_prefs.sql` — the agent-writable layout override:
  ```sql
  create table public.today_prefs (
    user_id         uuid primary key references auth.users(id) on delete cascade,
    focus           text,
    ordered_app_ids text[] not null default '{}',   -- empty ⇒ fall back to usage-based selection
    hidden_app_ids  text[] not null default '{}',
    updated_by      text   not null default 'user', -- 'user' | 'agent'
    updated_at      timestamptz not null default now()
  );
  alter table public.today_prefs enable row level security;
  create policy "own today_prefs" on public.today_prefs for all
    using (auth.uid() = user_id) with check (auth.uid() = user_id);
  ```
- [ ] `src/supabase/migrations/<ts>_notification_prefs_agent_enabled.sql`:
  ```sql
  alter table public.notification_prefs
    add column if not exists agent_enabled boolean not null default false;
  ```
- [ ] Apply locally / to the project; record in memory's migration-drift note when applied.
- [ ] `docs/database.md`: document `today_prefs` + the new column.

> **`agent_actions` is NOT needed in Phase A** — it's the Phase-B write/undo log. Skip it here.

## 3. Pure helpers (write tests first — these are the test core)
- [ ] `src/lib/spine/today-view.ts` → add **`resolveTodayApps`** (pure):
  ```ts
  /** Explicit layout wins; else fall back to usage-based chooseApps. Hidden always filtered.
   *  Result is filtered to apps that actually have an adapter, deduped, and capped. */
  export function resolveTodayApps(
    prefs: { ordered_app_ids: string[]; hidden_app_ids: string[] } | null,
    usage: { app_id: string; pinned: boolean }[],
    registered: string[],
    cap: number,
  ): string[]
  ```
  Behavior: if `prefs?.ordered_app_ids?.length` → use that order, drop `hidden_app_ids`, keep only
  `registered`, dedupe, cap. Else → `chooseApps(usage, registered, cap)` then drop `hidden_app_ids`.
  Empty prefs ⇒ **identical** to current behavior (back-compat).
- [ ] `src/lib/agent/guard.ts` → **`agentAvailable`** (pure predicate over flags + prefs):
  ```ts
  export function agentAvailable(
    env: { AGENT_ENABLED?: string; AI_GATEWAY_API_KEY?: string },
    prefs: { agent_enabled?: boolean } | null,
  ): boolean   // true only if flag on AND key present AND user opted in. Fail-closed.
  ```

## 4. Agent runtime (`src/lib/agent/`)
- [ ] `src/lib/agent/context.ts` → **`assembleAgentContext(ctx: SpineCtx)`**: build one model-safe
  JSON snapshot by **reusing** `getToday` + `ensureXp` + `buildNudgeInput`, plus:
  - current `today_prefs` (focus + order + hidden) and pins (`app_usage`);
  - a **catalog digest** of the user's relevant apps (`getApp`): `id`, `name`, `category`, `ui`, and
    for template apps the `*_type` from `config` — capped to used/registered apps (never dump all 87).
  - Never include another user's data (RLS) or raw third-party text.
- [ ] `src/lib/agent/tools/layout.ts` → the **live** layout tools (zod-validated, user-session, RLS):
  - [ ] `set_focus(text)` → upsert `today_prefs.focus`, `updated_by='agent'`.
  - [ ] `set_today_layout(orderedAppIds: string[])` → validate each id ∈ catalog; upsert
        `ordered_app_ids`. Reject/skip unknown ids (don't throw the turn).
  - [ ] `hide_app(appId)` / `show_app(appId)` → add/remove from `hidden_app_ids`.
  - [ ] `pin_app(appId)` / `unpin_app(appId)` → **reuse `toggleFavorite`** (`app_usage.pinned`),
        not a new write path.
  Each handler returns a compact `{ ok, summary }` the model can read back, and the action records
  what changed so the panel can show "Applied: …".
- [ ] `src/lib/agent/tools/registry.ts` → assemble the Phase-A tool list (layout only). Structure it
  so Phase B can add entry tools without refactor. (Generator `build:agent-tools` is **deferred to
  Phase B** when one-file-per-app custom tools appear; a hand-written registry is fine for layout.)
- [ ] `src/lib/agent/run.ts` → **`runAgentTurn(input, ctx, mode)`**:
  ```ts
  // generateText tool-loop via the AI Gateway. Bounded + safe.
  // model "anthropic/claude-sonnet-4-6"; stopWhen: stepCountIs(6); maxOutputTokens bounded;
  // abortSignal timeout. Runs in the USER session (RLS). Returns:
  //   { text: string; applied: { kind: string; detail: string }[] }
  ```
  - [ ] System prompt: explain the user's apps + the Today layout model; rules — only act on what the
        user said or the snapshot; never fabricate; **Phase A may only reshape layout, never create
        entries**; prefer the smallest change that satisfies the request.
  - [ ] On any model/gateway failure → return a graceful "agent unavailable" turn, never throw.
- [ ] `src/lib/agent/guard.ts` wired into the entry points (action + panel visibility).

## 5. Surface & wiring
- [ ] `src/app/today/_agent/actions.ts` (`"use server"`):
  - [ ] `tuneToday(message: string)`: load `SpineCtx` + prefs, `agentAvailable()` gate (return early if
        not), `assembleAgentContext`, `runAgentTurn`, then `revalidatePath("/today")`. Returns the
        turn result to the client.
  - [ ] `revertTodayToAuto()`: delete the user's `today_prefs` row (or clear order/hidden/focus),
        `revalidatePath("/today")`.
- [ ] `src/app/today/_agent/TunePanel.tsx` (client): a phone-first slide-over — message input, the
  assistant reply, an "Applied: …" list, and a "Revert to automatic" button. Dark/zinc/cyan idiom,
  44px targets, safe-area aware. Only mounted when the agent is available.
- [ ] `src/components/modern/today/TodayHeader.tsx`: add a "✦ Tune" trigger (only when available) and
  render the **focus line** when `today_prefs.focus` is set. Add an optional `focus?: string` prop.
- [ ] `src/app/today/page.tsx`:
  - [ ] Fetch `today_prefs` alongside `app_usage`.
  - [ ] Swap `chooseApps(...)` → **`resolveTodayApps(prefs, usage, REGISTERED_APP_IDS, 8)`**.
  - [ ] Pass `focus` to `TodayHeader`; mount `TunePanel` (gated).
  - [ ] Compute `agentAvailable()` server-side (read `notification_prefs.agent_enabled`) to gate the UI.

## 6. Test gate (Vitest; mock the model + Supabase)
- [ ] `resolveTodayApps`: explicit order wins; hidden filtered in both modes; unknown/non-adapter ids
      dropped; dedupe; cap; **empty prefs ≡ `chooseApps`** (back-compat assertion).
- [ ] `agentAvailable`: all of {flag off, no key, opt-out, no prefs row} ⇒ false; all-on ⇒ true.
- [ ] Layout tool zod schemas: reject malformed args; `set_today_layout` drops unknown ids; handlers
      issue the expected upsert / `toggleFavorite` call (Supabase mocked).
- [ ] `runAgentTurn` (model mocked): a scripted tool call dispatches to the right handler; step cap
      honored; a gateway error returns the graceful "unavailable" turn rather than throwing.
- [ ] Page-level: with a `today_prefs` row, `/today` selects the explicit set; without one, unchanged.
- [ ] `npm test` green; `npm run build` clean.

## 7. Docs & memory (per the project's "update docs + memory" rule)
- [ ] `docs/spine.md`: add a short "Layer 7 — Agent (Phase A live)" note **and** correct the stale
      `quickLog`/Quick Capture drift (flagged in the parent spec §3).
- [ ] `docs/architecture.md`: one line under "The Spine" pointing at `src/lib/agent/`.
- [ ] `docs/environment.md` + `docs/database.md`: as in §1–§2 above.
- [ ] Memory: update `project_coherence-dashboard.md` (or a new `project_agent-layer.md`) noting
      Phase A shipped, behind `AGENT_ENABLED`, owner-dogfood.

## 8. Out of scope for Phase A (explicitly deferred)
- Creating entries in any mini-app (Capability B — `propose→confirm`, `agent_actions` undo log).
- The generated one-file-per-app tool registry (`build:agent-tools`).
- Conversation persistence (`agent_threads`/`agent_messages`).
- Proactive/background discovery via the digest (Phase C).
- Streaming the agent turn (v1 returns the full turn; streaming is a later enhancement).

## File manifest (new / touched)
```
NEW   src/lib/agent/{guard,context,run}.ts
NEW   src/lib/agent/tools/{layout,registry}.ts
NEW   src/app/today/_agent/{actions.ts, TunePanel.tsx}
NEW   src/supabase/migrations/<ts>_today_prefs.sql
NEW   src/supabase/migrations/<ts>_notification_prefs_agent_enabled.sql
EDIT  src/lib/spine/today-view.ts            (+ resolveTodayApps, pure)
EDIT  src/app/today/page.tsx                 (fetch prefs; chooseApps → resolveTodayApps; gate UI)
EDIT  src/components/modern/today/TodayHeader.tsx  (+ Tune trigger, focus line, focus? prop)
EDIT  package.json                           (+ ai, zod)
EDIT  .env.example, docs/{environment,database,spine,architecture}.md
NEW   tests/agent-*.test.ts, tests/today-view-resolve.test.ts
```
