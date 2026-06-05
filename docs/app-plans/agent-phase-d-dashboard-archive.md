# Agent Layer — Phase D: Dashboard Archive (retrieve-before-generate)

A friction-reduction phase for the [Agent Layer](agent-layer.md). When a user describes what they
need, **match their answers against an archive of already-built Today layouts and load the best one
instantly**; only fall back to the agent (Phase A) to **stitch a new one when nothing scores well
enough — and archive that result** so the next person with the same shape gets it for free.

> **Status:** 🟠 **PROPOSED / EXPLORATORY.** Depends on Phase A (`today_prefs`, `resolveTodayApps`).
> Strategically this is a **scale optimization** — read §2 before scheduling it.
>
> **The instinct is correct:** retrieve-before-generate is the right pattern. A cheap match that hits
> avoids both the **latency** of a Sonnet tool-loop and its **cost**, and hands the user a *proven*
> layout instead of a cold one. The design below is sound. The only real question is **when** it pays
> off — and one reframing makes it pay off *now* instead of only at scale.

---

## 1. The idea, restated
```
user answers / stated needs
        │
        ▼
   score against the archive  ──►  best score ≥ threshold ?
        │                                │
        │                          yes → load that dashboard  (instant, no model call)
        │                                │
        │                          no  → agent stitches a new one (Phase A) ──► archive it
        ▼                                                                          │
   (next user with the same shape now gets the cached one) ◄─────────────────────┘
```

## 2. The honest caveat — "created by someone else" assumes a crowd
The pitch — *"something that was already created by someone else"* — presupposes a **population of
users** generating diverse dashboards so the archive fills with reusable variety. XP Boost is, today,
effectively **single-user** (the owner; see `spine.md` §6 "Single- vs multi-user… deferred"). With one
user:
- The archive is just **your own past dashboards** — still useful (revisit "Money month" next
  January without re-deriving it), but the "someone else already did the work" benefit is **zero
  until there are other people**.
- Every early request is a **cache miss → generate → archive**. The cache only starts paying back
  after it's populated. This is the classic **cold-start tax**: a crowd-cache has no value until
  there's a crowd.

So building the *crowd-sourced* version now optimizes a cost (a few-second first-run agent call, for
one user) that is currently trivial. **Don't build the crowd-cache until there's a crowd.** That's the
pushback.

## 3. The reframe that makes it valuable *now*
The same retrieve-before-generate mechanism is immediately valuable if you change **what's in the
archive** from "whatever users happened to generate" to **a small library of curated starter
archetypes**:

> **"Fitness focus," "Money month," "New parent," "Deep work," "Recovery / health reset,"
> "Student / semester," "Side-project sprint."**

A handful of **hand-authored** (or owner-authored) dashboards, each = an ordered app list + a focus
line + tags. A new user (or the owner switching modes) is **matched to the closest archetype and gets
it instantly, zero model call** — then refines it with the Phase-A agent if they want. This:
- works at **any scale** (no crowd required),
- replaces today's bland cold-start (`chooseApps` → "all registered apps, capped") with a **fitted**
  first run,
- and is the **same machinery** the crowd-archive needs — so it's not throwaway. The crowd version is
  just "let user-generated dashboards (opt-in) flow into the same archive and compete on adoption."

**Recommended framing: ship the curated-presets fast path; let the agent be the generate-on-miss
fallback; treat the self-filling crowd archive as the *scale evolution* of the identical system.**

→ The concrete starter library (eight archetypes + the adapter roadmap they imply) is specced in
**[agent-phase-d-seed-archetypes.md](agent-phase-d-seed-archetypes.md)**.

## 4. What a "dashboard" is here (why this is cheap and portable)
From Phase A, a Today layout is just `today_prefs`:
```ts
{ focus: string; ordered_app_ids: string[]; hidden_app_ids: string[] }
```
That's a **tiny JSON object — an ordered list of ~8 app ids + a focus string.** Consequences:
- An archived dashboard is a few hundred bytes; matching/loading is effectively free.
- The app-id list carries **no personal data** — it's portable across users by construction (privacy
  caveat is only the free-text `focus`; see §8).
- Its **tags are derivable for free** from the `category` of each app via the catalog's stable
  `CATEGORIES` (no new taxonomy to invent). A "Fitness focus" dashboard is simply one whose apps skew
  to the `health`/`fitness` categories.

## 5. Matching / scoring (deterministic first, embeddings later)
**v1 — deterministic tag overlap (recommended; pure + testable + instant):**
- Derive a **need profile** from the user's answers — either a 3–4 question onboarding picker
  ("What do you want to stay on top of?" → category chips) or by parsing their free-text *once* with a
  cheap Haiku call into a category/tag set. Picker is preferable: zero model, fully deterministic.
- Each archived dashboard carries a **tag set** (its apps' categories + any explicit labels).
- `score(need, preset)` = weighted overlap (Jaccard or cosine over the category vector). Pure
  function, unit-tested like `chooseApps`.
- **Threshold T:** best score ≥ T → load that preset into `today_prefs`; else → agent generates.
  Tune T against the seed library.

**v2 — embedding similarity (fast-follow, only if free-text matching proves necessary):**
- Embed the `focus` statement; cosine-match against archived focus embeddings via Postgres
  `pgvector`. More flexible for nuanced free-text, but adds the extension + an embedding call per
  match. Keep the deterministic tag score as the cheap pre-filter; use embeddings only to break ties.

## 6. Data model (one table)
```sql
create table public.dashboard_presets (
  id           bigint generated always as identity primary key,
  slug         text unique,                 -- "fitness-focus" for curated; null for user-contributed
  title        text not null,               -- "Fitness focus"
  tags         text[] not null default '{}',-- category ids + labels; the match vector
  app_ids      text[] not null,             -- the ordered layout (must all have adapters at load time)
  focus        text,                        -- the focus line this preset sets (curated = generic copy)
  source       text not null default 'curated', -- 'curated' | 'agent' | 'user'
  adopt_count  integer not null default 0,  -- kept-after-load (quality signal; see §9)
  load_count   integer not null default 0,
  created_by   uuid references auth.users(id) on delete set null,  -- null for curated/seed
  created_at   timestamptz not null default now()
);
alter table public.dashboard_presets enable row level security;
-- Curated/shared presets are READABLE by any authed user; writes are service-role / owner only.
create policy "read shared presets" on public.dashboard_presets for select
  using (source = 'curated' or created_by = auth.uid());
-- (No public insert policy — agent-archived + user-contributed inserts go through a guarded server
--  action, never a raw client write. See §8.)
```
- Curated archetypes are **seeded** via a migration (or a `scripts/seed-presets.mjs`), `source='curated'`.
- A miss-generated dashboard is archived by a **server action** (service-role or owner-gated), not a
  client write — so the archive can't be poisoned and personal `focus` text is sanitized first.

## 7. The flow (where it plugs into Phase A)
1. **New user / "set up my Today":** show the onboarding picker → `need` profile.
2. `matchPreset(need, presets, T)` (pure) → best preset or null.
3. **Hit:** write its `app_ids`/`focus` into `today_prefs` (`updated_by='preset'`); `revalidatePath`.
   Instant, no model. Offer "Tune this" → drops into the Phase-A agent panel.
4. **Miss:** run the Phase-A agent to stitch a layout (existing path) → write `today_prefs` →
   **archive** a generalized copy (`source='agent'`, sanitized tags, no raw personal focus) for reuse.
5. `resolveTodayApps` (Phase A) already renders whatever lands in `today_prefs` — **no new render
   path needed.** This phase only changes *how the prefs get populated*, not how they're displayed.

## 8. Privacy (the real design constraint, given the public repo / security posture)
- **App-id lists are non-personal** — safe to pool/share.
- **Free-text `focus` is not.** "Managing my divorce and custody schedule" must never flow into a
  shared archive. Rules:
  - Curated/agent-archived presets store a **generic** focus line + **structured tags only**, never a
    user's raw focus string.
  - User-contributed sharing is **opt-in and explicit**, with the focus sanitized/regenerated to a
    generic label before it's pooled.
  - All archive writes go through a **guarded server action** (allowlist of fields, no raw client
    insert) — same discipline as the capture allowlist and the agent tool registry.
- Reads of shared presets are fine for any authed user (no personal data in them).

## 9. Quality loop (future, needs scale)
When there are many presets competing, rank by **adoption**: increment `adopt_count` when a loaded
preset is *kept* (not reverted-to-auto or heavily edited within, say, 24–48h), `load_count` always.
`adopt_count / load_count` becomes the tiebreaker so good dashboards rise and junk sinks. Purely a
scale feature — no value at single-user; note and defer.

## 10. Cost / benefit & when to build
| | Curated presets (§3) | Crowd archive (§1 as pitched) |
|---|---|---|
| Value at single-user | **High** — fitted cold-start, instant | ~None (you only match your own past) |
| Value at scale | High | **High** — proven, diverse, self-improving |
| Cold-start tax | None (seed the library once) | Heavy (empty until a crowd fills it) |
| Build cost | Low–Med (picker + tag match + seed) | Med (adds contribute flow, moderation, quality loop) |
| Privacy surface | Small (curated copy is clean) | Larger (pooling user-generated focus text) |

**Recommendation:** schedule this as **Phase D, after Phase A (and ideally B)**. Build the **curated
presets + deterministic matching** first — it's the part that helps now. Wire the **archive-on-miss +
opt-in contribution + adoption ranking** only once there's a real multi-user base (the same trigger
that unlocks the other deferred social features in `spine.md` §6).

## 11. Open questions
1. **Need-capture:** onboarding **picker** (deterministic, recommended) vs **free-text parsed by
   Haiku** (smoother, costs a call)? Could ship picker first, add free-text later.
2. **Threshold T** and the score function (Jaccard vs weighted cosine) — tune against the seed set.
3. **Who authors the seed archetypes** — owner hand-writes 6–8, or generate them once with the agent
   and curate? (Recommend owner-curated for quality.)
4. **Adapter coverage dependency** — presets can only include apps that have adapters (6 today). Same
   ceiling as Phase A; a "Fitness focus" preset is only as good as the fitness adapters that exist.
5. **Re-matching cadence** — one-time at onboarding, or re-offer when the user's needs visibly shift?

## 12. Risks
- **Premature crowd-cache** — building the self-filling archive before there are users optimizes a
  non-problem. Mitigated by shipping curated-presets-first (§3).
- **Stale presets** — an archived dashboard referencing an app whose adapter was removed/renamed must
  be filtered at load (`resolveTodayApps` already drops non-adapter ids — reuse that).
- **Privacy leak via `focus`** — §8 is non-negotiable; never pool raw focus text.
- **Generic-but-wrong** — a mediocre match that *almost* fits can be worse than a clean cold-start;
  keep T conservative and always offer "Tune this" / "start fresh."

## 13. Test surface (pure-first)
- `matchPreset(need, presets, T)`: exact-tag hit; partial overlap ordering; below-threshold → null;
  empty archive → null; ties broken deterministically.
- Tag derivation from an app-id list via catalog `category` (mock catalog).
- Load path: a hit writes the preset's `app_ids`/`focus` into `today_prefs`; `resolveTodayApps` then
  renders exactly those (reuses Phase-A tests).
- Sanitizer: archive-write strips raw focus / keeps only allowlisted fields + structured tags.
- Stale filter: a preset with a since-removed app id loads the surviving subset, never errors.

## File manifest (new / touched)
```
NEW   src/lib/agent/presets/{match.ts (pure), archive.ts (guarded server action), seed data}
NEW   src/app/today/_agent/Onboarding.tsx  (the need-capture picker)  — or fold into TunePanel
NEW   src/supabase/migrations/<ts>_dashboard_presets.sql  (+ seed, or scripts/seed-presets.mjs)
EDIT  src/app/today/_agent/actions.ts      (match → load-or-generate; archive on miss)
EDIT  docs/app-plans/agent-layer.md        (add Phase D to the phasing table)
EDIT  docs/{database,architecture}.md
NEW   tests/agent-presets-*.test.ts
```
