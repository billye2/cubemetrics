# OKRs (`okr`)

**Purpose** — Set qualitative Objectives, each measured by 2–5 Key Results that roll up to a single score.

**Current state** — Generic `GoalView` (hasTarget **yes**, `goalType: "okr"`). Each "goal" is a flat title + one target number. This fundamentally mismodels OKRs: an Objective is *qualitative* (no number of its own) and **owns** several Key Results — the template has no parent/child concept, so today OKRs are just single progress bars with the wrong label.

**Gaps** — No objective→key-result hierarchy. No roll-up score (an objective's % is the average of its KRs' %). No quarterly **cycle** (OKRs are time-boxed; Q2 2026 should be a distinct set you grade and archive). No **confidence / health** signal (the classic green/amber/red the team sets mid-cycle, independent of raw %). KRs come in different shapes (metric "0→100", milestone "done/not", baseline "from X to Y") — none expressible. No final grading/retro at cycle end.

**Plan** — Graduate to a custom app at `src/app/app/okr/`.

**P1 — makes it usable** ✅ shipped (custom app at `src/app/app/okr/`)
- [x] **Objective owns Key Results** — create an objective (title + optional cycle), then add 2–5 KRs each with its own current/target → per-KR % bar. Objective score = mean of KR %. Custom `OkrView.tsx` + `actions.ts` (add/edit/delete objective; add/update/delete KR).
- [x] **Confidence color** — per-objective on-track / at-risk / off-track set manually, shown as the card's accent (emerald / amber / red), independent of computed %.
- [x] **Cycle field** — tag each objective with a quarter (e.g. "Q2 2026"); group/filter by cycle, default to current.

**P2**
- **KR types** — metric (number→number), milestone (boolean), and baseline (start→target so % is computed from the start, not from 0). Increment buttons per KR (see `_goal-template.md`).
- **End-of-cycle grading** — close a cycle: snapshot final scores, write a short reflection, archive; start next cycle fresh.

**P3**
- **Progress history** per KR with a sparkline (reuse `goal_progress`).
- **Cycle dashboard** — overall attainment %, count green/amber/red.
- **Carry-over** an incomplete KR into the next cycle.

**Data** — Graduate from the single `goals` row. Reuse `goals` for objectives + a self `parent_id` for KRs **or** (cleaner) `objectives (id, user_id, title, cycle, confidence, status)` + `key_results (id, objective_id, title, kr_type, start_value, current_value, target_value)`. Standard RLS pair on both. Optional `goal_progress`-style KR history.

**Verdict** — **GRADUATE** — hierarchy + roll-up can't live on a flat single-bar template. Effort **M** (objective+KR CRUD with roll-up) **/ L** (with cycles, KR types, grading).

---

**Schema delta (migration `20260530T0700_okr.sql`)** — replaces the single `goals` row with a proper hierarchy. Two new tables, standard owner + SysOp RLS pair on both; `key_results` cascade on objective delete. (Fold into `docs/database.md` at fan-in.)

```
objectives   (id, user_id, title, cycle TEXT, confidence TEXT default 'on_track', created_at)
key_results  (id, user_id, objective_id FK→objectives ON DELETE CASCADE,
              title, current_value NUMERIC, target_value NUMERIC default 100,
              sort_order, created_at)
```

Objective score (mean of KR %s) and KR % (clamped `current/target`) are **computed in the app** (`src/app/app/okr/lib.ts`), not stored. The old catalog entry switched from `ui: goal` to `ui: modern`.

**Shipped:** P1 only. P2 (KR types: milestone/baseline, increment buttons, end-of-cycle grading) and P3 (KR history sparkline, cycle dashboard, carry-over) are still open.
