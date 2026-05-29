# Skill Tree (`skilltree`)

**Purpose** — Level up skills via practice — XP, levels, and prerequisite dependencies in a visual tree.

**Current state** — Generic `GoalView` (hasTarget **no**, `goalType: "skill"`). A skill is just a title you "mark complete" — a flat checkbox list. None of the defining ideas exist: no levels, no XP, no practice log, no dependencies between skills. This is the **most distinctive** app forced through the plainest template shape, so it loses the most by staying.

**Gaps** — No **levels / XP** (a skill isn't done/not-done; it grows). No **practice log** to *earn* XP (the input loop that drives the whole thing). No **current level + next-level threshold** (the "850/1000 XP to Lv 4" hook). No **prerequisites / dependencies** — the literal "tree": skill B unlocks only after skill A reaches level N. No **visual graph** of the tree with locked/unlocked/maxed nodes. This is a genuinely different data model (a DAG with leveling), not a list.

**Plan** — Graduate to a custom app at `src/app/app/skilltree/`. The headline is XP + dependencies.

**P1 — makes it usable**
- **Skills with levels + XP** — each skill has accumulated XP; level is derived from a threshold curve (e.g. level n needs ~`base * n^1.5` XP). Card shows current level, a bar to the next threshold, and total XP. Custom `SkillTreeView.tsx` + `actions.ts`.
- **Practice log** — log a practice session (skill + XP amount, optional minutes/note) → XP rises, level may tick up with a flourish. This is the core loop; each entry is a history row.
- **Add / edit / delete skill.**

**P2**
- **Prerequisites / dependencies** — a skill can require other skills at a minimum level; a locked skill shows what unlocks it. Store edges in a join table; compute locked/unlocked state.
- **Visual tree** — render nodes by dependency depth with connector lines; color by state (locked grey / unlocked cyan / maxed gold). Phone-first: a scrollable vertical tier layout rather than a sprawling canvas.

**P3**
- **XP from other apps** — auto-grant XP when a linked course/habit logs progress.
- **Practice streak** + weekly XP chart; total account level across all skills.
- **Decay / rust** — optional XP decay if a skill goes untouched.

**Data** — Graduate from `goals`. New tables: `skills (id, user_id, name, xp, category)`; `skill_practice (id, skill_id, xp, minutes, note, created_at)`; `skill_deps (skill_id, requires_skill_id, min_level)`. Standard RLS pair on each; levels/locks computed in `page.tsx`.

**Verdict** — **GRADUATE** — XP, a leveling curve, a practice log, and a real dependency graph are wholly outside a single progress bar. The most worthwhile graduation of the nine. Effort **L**.
