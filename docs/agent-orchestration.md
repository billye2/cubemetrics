# Agent Orchestration

How multiple autonomous agents build XP Boost **in parallel** without overwriting each other or
doing duplicate work.

**Status:** Proposed (2026-05-29). Phase 0 (`_status.md` ledger) already shipped in `c1fc940`.
**Audience:** anyone wiring up multi-agent builds — and the agents themselves.

---

## Why this exists

The repo already runs agents that build apps from `docs/app-plans/`. With one agent at a time
that's fine. The moment two run concurrently, two failures appear — and we have already seen both:

- **Duplicate work.** The `claude/role-builder-RRjdY` branch re-implemented Journal/Notes Markdown
  rendering that PR #15 had already merged to `master`. Two agents, same feature, one wasted.
- **Stranded work.** That same branch's *unique* contribution — a Journal/Notes search box — never
  merged and was nearly lost; it had to be cherry-picked back (`5929e7e`) after the branch was found.

Neither was a code bug. Both were **coordination** failures: no shared record of what was claimed,
what shipped, and where the seams are. This spec closes that gap.

---

## What makes XP Boost *easy* to parallelize

The architecture is ~90% there already. Most of an app lives on its own island that no other
agent touches:

- **Custom app** → its own directory `src/app/app/<id>/` (`page.tsx` + `actions.ts` + view).
- **Template app** → a single catalog entry, no new files at all.
- **Every app** → its own plan at `docs/app-plans/<id>.md`.

Two agents building two different apps share **zero** code — *except* at a handful of seams.

## The collision map

These are the only files where independent agents actually contend:

| Seam | Why it collides | Severity |
|------|-----------------|----------|
| `src/lib/modern/catalog.ts` | *(was)* a single ~90-entry `APPS` array every new app appended to → guaranteed merge conflict. **Resolved in Phase 2:** now generated from one-JSON-per-app under `catalog/apps/` (see [Decision 2](#decision-2--catalog-de-confliction)). | ~~High~~ resolved |
| `src/supabase/migrations/NNN_*.sql` | Sequential integer naming (next is `031_`). Two agents both grab `031` → filename clash + ambiguous apply order. | **High** |
| `docs/database.md` | Shared schema doc; every table-adding app edits it. | Medium |
| `docs/app-plans/_*-template.md` | Shared factory-template plans; one edit affects every app on that family. | Medium |
| `docs/app-plans/_status.md` | The shared status ledger — by design everyone updates it. | Low (text, easy 3-way merge) |

Everything else is islandable. The strategy below is: **fan out on the islands, serialize the seams.**

---

## Design principles

1. **One agent owns one app, end to end.** The unit of parallel work is a catalog app, not a file.
2. **Isolate while building, integrate at the seams.** Agents never edit the same file at the same
   time; shared files are folded in by a single serial step.
3. **Claim before you build.** No work starts until it's recorded as claimed, atomically.
4. **The ledger is the source of truth**, not an agent's memory. `docs/app-plans/` already is this.
5. **Green or it doesn't ship.** Every lane passes `npm test` + `npm run build` + secret audit
   before it can merge (the existing [builder](../.claude/roles/builder.md) gates).

---

## The setup — four pillars

### 1. Isolation: one git worktree per agent

Each agent works on its own branch in its own working copy (`git worktree` / the Agent tool's
`isolation: "worktree"`). They **physically cannot** overwrite each other's files; conflicts can
only surface at merge time, never mid-edit.

- Branch naming: `claude/<app-id>-<shortid>` (matches the existing `claude/...` convention).
- One worktree = one app = one branch. Worktrees are disposable; delete on merge.
- **The branch must be merged or explicitly abandoned the same session it's created.** The
  role-builder incident was a branch that outlived its session and got forgotten. See
  [Branch lifecycle](#branch-lifecycle).

### 2. Claim ledger: no two agents pick the same app

The backlog already exists — `docs/app-plans/` + the `_status.md` index. We add an **atomic claim**
so two dispatchers can't hand out the same app. Two options, pick one:

**✅ Decision — GitHub issues are the canonical queue (Option B), with a `_status.md` claim column
(Option A) as the attended-small-run fallback.** See [Decision 1](#decision-1--claim-mechanism).

**Option B — GitHub issues as the queue (canonical).**
Seed one issue per open backlog app. An agent self-assigns + applies an `agent:in-progress` label
**atomically** via the API, builds, and opens a PR that closes the issue. Benefits:
- Assignment is genuinely atomic (GitHub rejects a double-assign race) — the only option with no
  claim race.
- Dovetails with the existing feedback → issue → `@claude` Action → PR loop (see
  [architecture.md](architecture.md)) — same machinery, no new concept.
- The PR, not a direct push, becomes the integration point (see pillar 4 and
  [Decision 3](#decision-3--who-pushes-master)).

**Option A — `_status.md` claim column (fallback for attended runs of ≤2 agents).**
Add a `Claim` state to the ledger. An agent's *first* action is a tiny commit flipping its target
from `available` → `claimed:<branch>` **before** any code. If the flip conflicts on push, another
agent got there first — pick a different app. Cheap and dependency-free, but the claim race is
resolved at push time (last-writer-loses → retry), not truly atomic — so it is *only* sanctioned
when a human is watching and concurrency is low. Anything unattended or beyond ~2 agents uses B.

### 3. Ownership rule (the real anti-duplication rule)

Baked into the [builder role](../.claude/roles/builder.md):

> **One agent = one app = its own `src/app/app/<id>/` dir + its own migration + its own
> `docs/app-plans/<id>.md`. Never edit another app's directory. Never hand-edit the seam files
> (`catalog/_generated.ts`, `database.md`, `_*-template.md`) directly — drop a `catalog/apps/<id>.json`
> and emit doc deltas instead (pillar 4).**

This single rule removes essentially all conflicts that aren't a seam file.

### 4. Defuse the seam files

**Migrations → timestamp names, not sequential integers.**
Switch the convention from `031_recipes.sql` to **`YYYYMMDDTHHMM_<slug>.sql`**
(e.g. `20260529T1430_recipes.sql`). Independent agents never collide on a number, and
lexicographic order still gives deterministic apply order. Existing `001–030` stay as-is — the rule
applies to *new* migrations only. (Document in [database.md](database.md) + [commands.md](commands.md).)

**✅ Decision — agents stop hand-appending; a codegen step assembles the catalog (B1).**
See [Decision 2](#decision-2--catalog-de-confliction).

- **B1 — Deferred entry + codegen (chosen, shipped in Phase 2).** A building agent does *not* touch
  the catalog array. It drops one `src/lib/modern/catalog/apps/<id>.json` and runs
  `npm run build:catalog` (`scripts/build-catalog.mjs`, wired into `prebuild` + `pretest`), which
  validates and assembles every entry into the generated `catalog/_generated.ts` (`APPS`). The
  generated array is integrator-owned → zero contention; each agent only writes its own JSON file.
  Chosen because it is the only mechanism that gives *true* zero-collision even when two agents
  build apps in the same category. *(Entries live in `catalog/apps/`, not in each app's page dir —
  template apps have no page dir, and a dedicated folder keeps custom and template apps uniform.)*
- **B2 — Split by category (rejected; interim-only).** Break `catalog.ts` into
  `src/lib/modern/catalog/<category>.ts` re-exported by an index. Lighter to adopt, but two new
  apps in the *same* category still collide — so it is only an acceptable stopgap if codegen (B1)
  can't land in Phase 2. The committed end state is B1.

**Shared docs → integrator-only.** Builders never edit `database.md` or `_*-template.md`. They
write their schema delta and any template observation into their **own** `<id>.md` plan. The
integrator folds those deltas into the shared docs during fan-in. `_status.md` is the one shared
ledger builders *do* touch (low-risk text; resolves with a trivial 3-way merge, as
`5929e7e` demonstrated).

---

## Roles

The existing roles ([spec-writer / builder / reviewer](../.claude/roles/README.md)) stay. Parallel
builds add two coordinating roles and amend the builder.

| Role | Concurrency | Owns | Touches seam files? |
|------|-------------|------|---------------------|
| **dispatcher** | 1 | Picking N unclaimed apps from the ledger, flipping claims / assigning issues | No |
| **builder** *(amended)* | N (parallel, isolated) | One app island, end to end | **No** — emits deltas |
| **integrator** *(new)* | 1 (serial) | Merging branches, regenerating `catalog/_generated.ts` (`npm run build:catalog`), folding `database.md`/templates, full-suite verify, push | **Yes — exclusively** |

**Builder amendments** (add to `.claude/roles/builder.md`):
- Work in an isolated worktree on a `claude/<app-id>-<shortid>` branch.
- Honor the [ownership rule](#3-ownership-rule-the-real-anti-duplication-rule).
- New migrations use the timestamp convention.
- Do **not** edit `catalog/_generated.ts` / `database.md` / `_*-template.md`; drop a
  `catalog/apps/<id>.json` and emit the schema delta to your plan instead.
- Merge or abandon the branch the same session (no orphans).

**New `integrator` role** (`.claude/roles/integrator.md`): owns every seam file, runs the fan-in,
runs the full suite **once across the union** of merged work, audits the combined diff for secrets,
then commits/pushes to `master`. This is the *only* role that pushes to `master` in a parallel run.

---

## The orchestration pipeline

`dispatch → build (fan-out) → integrate (fan-in)`. Maps directly onto the **Workflow** tool —
pipeline for the work, a serial barrier for the seams:

```
Phase 1 — Dispatch (1 agent)
  read docs/app-plans/_status.md → select N apps that are open AND unclaimed
  claim each (Option A commit, or Option B issue assignment)

Phase 2 — Build (N agents, parallel, worktree-isolated)   ← the fan-out
  each owns one app:
    follow docs/app-plans/<id>.md, build P1 first
    own dir + timestamped migration + deferred catalog entry + schema delta in <id>.md
    gate: npm test + npm run build green, secret audit, tick [ ]→[x], update _status row
    open PR (Option B) or push branch (Option A)

Phase 3 — Integrate (1 agent, serial)                     ← the fan-in barrier
  merge each green branch
  npm run build:catalog → regenerate catalog/_generated.ts from all lanes' apps/*.json
  fold schema deltas into database.md; apply template observations
  run FULL npm test + npm run build across the union (catches cross-app breakage)
  audit combined diff for secrets → commit → push master (auto-deploys)
  apply new migrations to remote Supabase; delete merged worktrees/branches
```

A barrier at Phase 3 is correct here (not a smell): the integrator genuinely needs *all* branches
together to assemble the catalog and run one authoritative build. Phases 1→2 are pipelined per app.

---

## Verification gates (non-negotiable)

Inherited from the builder role, applied at two levels:

- **Per-lane (each builder, before its branch is mergeable):** `npm test` + `npm run build` green;
  diff audited for leaked secrets (public repo); plan checkboxes + `_status.md` row updated.
- **Union (integrator, before push):** full suite green across the *merged* tree — this is what
  catches "both lanes were green alone but collide together"; combined-diff secret audit; honest
  report of what shipped vs. what's still P2/P3.

Never push red. Never skip the secret audit to "ship faster."

---

## Branch lifecycle

The role-builder incident was a lifecycle leak, so make it explicit:

1. **Create** — dispatcher claims; builder opens `claude/<app-id>-<shortid>`.
2. **Build + verify** — per-lane gates green.
3. **Integrate** — integrator merges (or the `@claude` PR merges).
4. **Close** — branch + worktree deleted *immediately* on merge.
5. **Abandon** — if work is dropped, the claim is released (issue unassigned / ledger flipped back)
   and the branch deleted **the same session**. No branch outlives its session unmerged.

A periodic `git fetch --prune` + "branches ahead of master with no open PR" sweep catches anything
that slips — exactly how `5929e7e` was recovered.

---

## How this prevents the two failures we hit

| Failure (observed) | Prevented by |
|--------------------|--------------|
| Duplicate Markdown work (#15 vs role-builder) | **Claim ledger** + **ownership rule** — the feature would have been a single claimed unit; the second agent sees it claimed/shipped and skips it. |
| Stranded search box | **Branch lifecycle** (merge-or-abandon same session) + the prune/PR sweep — no branch quietly outlives its run. |
| (Latent) `catalog.ts` merge conflict | **Deferred entry + codegen** — agents stop hand-appending. |
| (Latent) migration number clash | **Timestamp migration names.** |

---

## Rollout plan (phased, low-risk)

- **Phase 0 — done.** `_status.md` ledger exists (`c1fc940`).
- **Phase 1 — done (2026-05-29).** Convention + role guardrails, no infra: `builder.md` carries the
  ownership rule + branch lifecycle; the timestamp-migration convention is in `database.md` +
  `commands.md`; `_status.md` has an **Active claims** block as the *attended-only* interim claim
  ([Decision 1](#decision-1--claim-mechanism) fallback). *Enables careful, watched 2-agent
  parallelism today.*
- **Phase 2 — done (2026-05-29).** Seam collisions killed: `integrator.md` added (the only role
  that pushes `master`, [Decision 3](#decision-3--who-pushes-master)); catalog codegen shipped
  ([Decision 2](#decision-2--catalog-de-confliction)) — `scripts/build-catalog.mjs` assembles
  `catalog/apps/*.json` → `catalog/_generated.ts`, wired into `prebuild`/`pretest`; `builder.md`
  now has builders drop a JSON entry and emit schema deltas to their plan instead of editing shared
  docs. The 86 existing apps were migrated to per-app JSON with grid order preserved exactly.
- **Phase 3 — scale the queue (canonical):** seed GitHub issues from the backlog (Option B,
  [Decision 1](#decision-1--claim-mechanism)) with branch protection on `master` so PRs can't
  self-merge, and wire the dispatch → build → integrate Workflow script under `.claude/workflows/`.
  *Enables unattended N-agent runs.*

Each phase is independently shippable and useful; stop at the concurrency level you actually need.

---

## Decisions (settled 2026-05-29)

These were the three open trade-offs; they are now committed. The choices are designed to compose:
**issues queue the work → builders open PRs → the integrator merges PRs, assembles the catalog by
codegen, runs one union build, and pushes `master`.**

### Decision 1 — Claim mechanism
**GitHub issues (Option B) are canonical; the `_status.md` claim column (Option A) is a fallback
for *attended* runs of ≤2 agents only.**
- *Why:* B is the only mechanism with genuinely atomic assignment (no claim race), and it reuses
  the existing feedback → issue → `@claude` Action → PR machinery rather than inventing a concept.
  A's push-time race is acceptable only with a human watching at low concurrency, so it stays as a
  convenience, not the default.
- *Implication:* unattended or >2-agent runs **must** use issues. The dispatcher seeds/reads issues;
  builders self-assign atomically.

### Decision 2 — Catalog de-confliction
**Deferred entry + codegen (B1) — shipped.** Agents drop `catalog/apps/<id>.json`;
`scripts/build-catalog.mjs` (wired into `prebuild` + `pretest`, also `npm run build:catalog`)
validates and assembles `APPS` into `catalog/_generated.ts`. Category split (B2) is rejected.
- *Why:* B1 is the only option that holds when two agents build apps in the *same* category — i.e.
  true zero-collision. B2 still collides there, so it doesn't actually solve the problem at scale.
- *Implication:* `src/lib/modern/catalog/_generated.ts` is generated output (integrator-owned);
  hand-edits to it are disallowed for builders, who only add `catalog/apps/<id>.json`.

### Decision 3 — Who pushes `master`
**Integrator-only, after a union build. Per-lane PRs are the queue/review surface but are never
auto-merged to `master`.**
- *Why:* auto-merging green per-lane PRs would skip the **union build** — the one gate that catches
  breakage which only appears once two independently-green branches are combined (e.g. catalog
  assembly, a shared-doc fold). Correctness beats the convenience of self-merge.
- *Implication:* branch protection on `master` requires the integrator (or its checks) as the
  merge gate; the `@claude` Action may *prepare* PRs but does not land them on `master` unattended.
  This is why the [pipeline](#the-orchestration-pipeline) keeps a serial Phase 3 barrier.

## Related docs

- [architecture.md](architecture.md) — RSC + Server Actions, the catalog, the feedback→GitHub loop.
- [database.md](database.md) — schema, RLS, migration conventions.
- [.claude/roles/](../.claude/roles/README.md) — spec-writer / builder / reviewer (+ proposed integrator).
- [docs/app-plans/](app-plans/README.md) — the backlog and `_status.md` ledger this builds on.
