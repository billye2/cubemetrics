# Skill Tree (`skilltree`)

**Purpose** — Level up skills via practice — XP, levels, and prerequisite dependencies in a visual tree.

**Current state** — Generic `GoalView` (hasTarget **no**, `goalType: "skill"`). A skill is just a title you "mark complete" — a flat checkbox list. None of the defining ideas exist: no levels, no XP, no practice log, no dependencies between skills. This is the **most distinctive** app forced through the plainest template shape, so it loses the most by staying.

**Gaps** — No **levels / XP** (a skill isn't done/not-done; it grows). No **practice log** to *earn* XP (the input loop that drives the whole thing). No **current level + next-level threshold** (the "850/1000 XP to Lv 4" hook). No **prerequisites / dependencies** — the literal "tree": skill B unlocks only after skill A reaches level N. No **visual graph** of the tree with locked/unlocked/maxed nodes. This is a genuinely different data model (a DAG with leveling), not a list.

**Plan** — Graduate to a custom app at `src/app/app/skilltree/`. The headline is XP + dependencies.

**P1 — makes it usable**
- [x] **Skills with levels + XP** — each skill has accumulated XP; level is derived from a threshold curve (`XP_BASE * n^1.5`, capped at MAX_LEVEL 10). Card shows current level, a bar to the next threshold, and total XP. Custom `SkillTreeView.tsx` + `actions.ts` + pure `lib.ts`.
- [x] **Practice log** — log a practice session (skill + XP amount, optional minutes/note) → XP rises, level ticks up with a "Level up!" flourish. Each entry is a history row; deleting an entry subtracts its XP back out.
- [x] **Add / edit / delete skill.**

**P2**
- [x] **Prerequisites / dependencies** — a skill can require other skills at a minimum level; a locked skill shows what unlocks it. Edges in `skill_deps`; locked/unlocked computed in `lib.ts` (`isLocked`/`unmetRequirements`). Reverse-edge guard prevents immediate A↔B cycles.
- [x] **Visual tree** — "Tree" tab renders nodes by dependency depth (`computeTiers`, longest-chain, cycle-guarded) in vertical tiers with connectors; color by state (locked grey / unlocked cyan / maxed gold). Phone-first 2-col grid per tier.

**P3**
- [x] **XP from other apps → global XP layer** — each `skill_practice` session now feeds the
  account-wide XP engine. Added a `skills` source in `src/lib/xp/rules.ts` (10 pts/session,
  capped 30/day) and wired the `skill_practice` query into `src/lib/xp/compute.ts`, so practice
  shows up on the `/app/xp` dashboard, streaks, breakdown, and early-bird/night-owl achievements.
  (Reframed from the speculative "linked course/habit" hook to the concrete, existing global XP layer.)
- [x] **Practice streak + weekly XP chart; total account level** — new "Stats" tab. Pure helpers in
  `lib.ts`: `accountLevel` (sum of every skill's level), `practiceStreak` (consecutive-day streak
  with one-day grace), `weeklyXp` (trailing-8-week Mon–Sun XP buckets). Header strip now leads with
  Account Lv + Streak; Stats tab renders the 8-week bar chart.
- [x] **Decay / rust** — non-destructive. `rustInfo`/`RUST_AFTER_DAYS` in `lib.ts` flags a skill that
  has gone untouched ≥14 days; surfaced as a 🦀 "rusty" chip on the card/tree node and a "Going rusty"
  panel in Stats. **XP is never auto-subtracted** — rust is a nudge only (auto-decay would silently
  destroy logged progress and fight the practice loop; rejected in favor of a visible hint).

**Data** — Graduate from `goals`. New tables: `skills (id, user_id, name, xp, category)`; `skill_practice (id, skill_id, xp, minutes, note, created_at)`; `skill_deps (skill_id, requires_skill_id, min_level)`. Standard RLS pair on each; levels/locks computed in `page.tsx`.

**Verdict** — **GRADUATE** — XP, a leveling curve, a practice log, and a real dependency graph are wholly outside a single progress bar. The most worthwhile graduation of the nine. Effort **L**.

---

## Shipped (P1 + P2 + P3)

Graduated from the `goal` template to a custom modern app. Catalog `ui` flipped
`goal` → `modern` (config dropped). Route lives at `src/app/app/skilltree/`
(`page.tsx`, `SkillTreeView.tsx`, `actions.ts`, `lib.ts`). Pure leveling/dep/stat math
is unit-tested in `tests/unit/skilltree-lib.test.ts`.

**P3 shipped** (this lane): global-XP wiring, a "Stats" tab (account level + practice
streak + 8-week XP chart), and non-destructive "rust" hints. No new migration —
P3 reuses the existing `skills` / `skill_practice` tables.

### Global XP layer delta (for the integrator)

`skill_practice` is now an XP source. `src/lib/xp/rules.ts` gained a `skills` field on
`DayActivity` (10 pts/session, `CAP.skills = 30`/day, label "Skill Tree"); `compute.ts`
queries `skill_practice.created_at` and folds it into the daily rollup + hour-of-day
signals. Additive only — no behavior change to existing sources.

### Schema delta — migration `20260530T0700_skills.sql` (for the integrator to fold into `docs/database.md`)

Three new tables, each with the standard owner + SysOp-read RLS pair:

- **`skills`** — `id`, `user_id`, `name`, `category` (default `'General'`),
  `xp` INTEGER ≥ 0 (running total; level derived in app code), `created_at`.
  Index `(user_id, category)`.
- **`skill_practice`** — append-only practice log. `id`, `user_id`,
  `skill_id` → `skills(id)` ON DELETE CASCADE, `xp` INTEGER > 0, `minutes` (nullable),
  `note`, `created_at`. Index `(skill_id, created_at DESC)`.
- **`skill_deps`** — dependency edges. `id`, `user_id`, `skill_id` → `skills(id)`,
  `requires_skill_id` → `skills(id)` (both ON DELETE CASCADE), `min_level` ≥ 1,
  `created_at`. `CHECK (skill_id <> requires_skill_id)`, `UNIQUE (skill_id, requires_skill_id)`.
  Indexes on `skill_id` and `requires_skill_id`.

Migration not yet applied to remote Supabase — left for the integrator on merge.
