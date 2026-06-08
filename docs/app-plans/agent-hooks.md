# Agent Hooks — the extension points the codebase needs

What contracts ("hooks") must Cubemetrics expose so a Claude agent ([Agent Layer](agent-layer.md)) works
*well* — not just at all? Today the app gives an agent **one** hook: the spine `today()` adapter
(read). Everything else an agent needs — to act, verify, remember, and stay safe — has no standardized
surface. This catalogs the hooks, grounded in real files, and prioritizes the critical few.

> **Build-ready specs for all nine** (issue-sized, with a Foundation lane + collision map) are in
> **[agent-hooks-build.md](agent-hooks-build.md)**.

## Frame: the agent loop
An agent that personalizes a dashboard and logs on the user's behalf runs a loop. Each stage needs a
hook; map what exists vs. what's missing:

```
Perceive → Decide → Act → Verify → Remember → (all of it) Governed
   ✅today()   (model)  ❌      ~revalidate  ❌            ❌
```

- **Perceive** — `today()` exists (6 apps), but it's *UI-shaped* (≤5 items, severity-capped).
- **Act** — **no uniform write hook.** Per-app `actions.ts` exist but aren't described to a model.
- **Verify** — `revalidatePath` re-renders, but there's no structured action-result/undo.
- **Remember** — **nothing.** No durable "what matters to this user" the agent can read back.
- **Govern** — **nothing.** No enable flag, opt-in, caps, or kill switch chokepoint.

So the honest answer: **three hooks are load-bearing (P1); the rest raise quality and scale.**

---

## P1 — Without these the agent can't function safely

### 1. An **Act** hook — typed, allowlisted per-app writes (the hands)
The single biggest gap. The spine adapter is read-only (`appId` + `today()`); the `quickLog?`/`match?`
in `spine.md` were never built. Add an optional **tool manifest** to the adapter — each a zod-validated
operation backed by an *existing* server action:
```ts
// extends SpineAdapter (src/lib/spine/types.ts)
tools?: AgentTool[];               // [{ name, description, schema, mode: "live"|"plan", handler(ctx,args) }]
```
- Template apps need ~6 generic tools total (the factory actions in `_factories/actions.ts`, keyed by
  catalog `*_type`); custom apps add their own, one-file-per-app, assembled by a generated registry
  (`build:agent-tools`, mirroring `build:spine`). **The registry IS the security boundary** — no
  free-form writes (successor to the removed `CAPTURE_TABLES` allowlist).
- *Status: specced in [Phase A/B](agent-phase-a.md) (layout tools live; entry tools propose→confirm).*

### 2. A **Remember/Preference** hook — where personalization lands
`/today` is driven only by `app_usage` (pins + recency) + a hardcoded section order — there's nowhere
for "focus on fitness and bills" to persist. Two stores:
```sql
today_prefs(user_id, focus, ordered_app_ids[], hidden_app_ids[], updated_by)  -- the layout override
user_facts(user_id, key, value, source, updated_at)                           -- durable agent memory
```
- `today_prefs` (Phase A) makes reshaping durable; `resolveTodayApps` reads it.
- `user_facts` is **new and underrated**: without it the agent re-derives the user's intent every
  session and can't honor "I told you last week I care about X." A tiny KV the agent reads at the top
  of every turn and writes when it learns something stable. *Status: `today_prefs` specced;
  `user_facts` is a new proposal.*

### 3. A **Govern** hook — one safety chokepoint
Every agent entry point calls one guard: `AGENT_ENABLED` (kill switch) + per-user opt-in
(`notification_prefs.agent_enabled`) + per-turn step/token caps + per-day turn cap. Fail-closed, like
`isAdmin()`. Without it there's no safe way to ship writes at all. *Status: specced as
`src/lib/agent/guard.ts` (Phase A).*

---

## P2 — Needed for trust and quality

### 4. A **Verify/Undo** hook — auditable, reversible actions
Every agent write recorded with an undo handle so the user can review and revert:
```sql
agent_actions(id, user_id, tool, args jsonb, undo_table, undo_id, created_at, undone_at)
```
Reuses the `QuickLogResult.undo` idea the spine envisioned. *Status: specced (Phase B).* This is what
makes propose→confirm trustworthy and "the agent did 5 things — undo any" possible.

### 5. A **Describe/Capability** hook — self-description for the model
So the agent reasons over apps *generically* (and degrades gracefully as the catalog grows to 94)
instead of hardcoding 6 app names:
```ts
describe?(): { verb: string; writes: string[]; reads: string[]; unit?: string };  // per adapter
```
Much of this is derivable from the catalog (`AppEntry.name/category/ui/config`) + the tool manifest,
so it can be **generated**, not hand-written. Lets new apps become agent-usable the moment they ship
an adapter — the governance flywheel. *Status: new proposal (cheap; mostly generated).*

### 6. An **agent-shaped Perceive** hook — richer than the card
`today()` is capped at 5 items for the UI. An agent reshaping a dashboard or reasoning about a request
sometimes needs a fuller (still bounded) read — recent trend, full open-item count, last-N entries:
```ts
context?(ctx): Promise<AgentAppContext | null>;   // bounded, model-safe; falls back to today() if absent
```
Reuses the `ensureXp` fan-out pattern. Keep it capped (token cost). *Status: new; optional per app.*

---

## P3 — Delight and scale

### 7. An **Observe/Event** hook — a semantic activity feed
Today the only cross-app signal is `app_usage` (counts) + `ensureXp` (scoring). An agent that
*discovers* patterns ("logged water every morning — want a goal?") and the preset **adoption** signal
both need a semantic stream:
```sql
app_events(user_id, app_id, kind, ref_id, at)   -- "completed", "logged", "created", …
```
Generalizes the usage beacon. Powers Capability C (proactive discovery) and Phase-D preset ranking.
*Status: new; the higher-leverage scale hook.*

### 8. A **Suggest** hook — per-app proactive nudges
```ts
suggest?(ctx): Promise<AgentSuggestion[]>;   // "pin budget?", "set a water goal?"
```
Feeds the dormant `src/lib/notify` digest (Layer 4) and the agent's proactive mode. *Status: new.*

### 9. A **Route/Match** hook — free-text capture routing
```ts
match?(input: string): number;   // 0..1 — should this app take "$12 lunch"?
```
Only needed if you revive a global capture bar (the removed QuickCapture). *Status: was envisioned;
revive only with a capture surface.*

---

## The consolidated adapter contract (all per-app hooks together)
Everything optional, one-file-per-app, generated registries — collision-free like the catalog/spine:
```ts
export interface SpineAdapter {
  appId: string;
  today(ctx): Promise<SpineToday | null>;          // Perceive (card)        — EXISTS ✅
  context?(ctx): Promise<AgentAppContext | null>;  // Perceive (fuller)      — P2 (#6)
  tools?: AgentTool[];                             // Act (typed writes)     — P1 (#1)
  describe?(): AppCapability;                      // Self-description       — P2 (#5)
  suggest?(ctx): Promise<AgentSuggestion[]>;       // Proactive nudges       — P3 (#8)
  match?(input: string): number;                  // Capture routing        — P3 (#9)
}
```
Plus the **global** hooks (not per-app): `today_prefs` + `user_facts` (Remember), `agent_actions`
(Verify/Undo), `app_events` (Observe), `guard.ts` (Govern), `build:agent-tools` (the generator).

## My recommendation
- **Ship the three P1 hooks first** — Act (tools), Remember (`today_prefs`), Govern (guard). That's
  the minimum for a working, safe agent, and it's already the [Phase A](agent-phase-a.md) scope.
- **Add P2 with the first writes** — `agent_actions` (undo) is non-negotiable the moment the agent
  creates data; `describe()` and `context()` are cheap and make the agent generalize past the 6 hand-
  wired apps.
- **`user_facts` (P1 #2) and `app_events` (P3 #7) are the two genuinely new ideas here** worth your
  attention — durable memory and a semantic event feed are what move the agent from "reshapes on
  request" to "knows you and notices things." Neither exists in the codebase or the current specs.
- **Don't build #8/#9 until there's a surface for them** (a digest channel / a capture bar) — hooks
  without a consumer are speculative.

## Open questions
1. **`user_facts` scope** — freeform KV vs. a typed schema (risk: a junk drawer). Recommend a small
   typed set first (focus areas, cadence prefs, do-not-suggest list).
2. **Where capability description lives** — generated from catalog+tools (less duplication) vs. a
   hand-written `describe()` per app (more control). Recommend generated, override-able.
3. **`app_events` write path** — emit from the existing server actions (accurate, touches many files)
   vs. a DB trigger per table (centralized, less app code). Recommend starting from the factory
   actions (few files, broad coverage).
