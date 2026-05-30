# Projects (`projecttracker`)

**Purpose** — Track personal projects through a status pipeline with tasks and a next action.

**Current state** — Generic `GoalView` (hasTarget **no**, `goalType: "project"`). A project is a title you "mark complete" — a flat checkbox. A project is not done/not-done: it moves through **states** (planning → active → blocked → done) and is made of **tasks**. The single binary status and absent task list mean it can't represent how a real project actually progresses or stalls.

**Gaps** — No **status pipeline** — just active vs completed; "blocked" (the most useful signal) is invisible. No **task checklist** inside a project, so no derived % and no sense of what's left. No **next action** (the GTD "what do I do next" that keeps projects moving). No **deadline**. No **board view** — projects naturally want columns by status. No way to see what's stuck (blocked + how long).

**Plan** — Graduate to a custom app at `src/app/app/projecttracker/` — a lightweight personal board.

**P1 — makes it usable** ✅ shipped (branch `claude/projecttracker-build`)
- [x] **Status pipeline** — explicit status: planning / active / blocked / done, set per project via a color-coded select; counts strip at top. Replaces the binary complete flag.
- [x] **Task checklist** — a project owns tasks you check off; **% complete derived** from tasks done (rounded), shown as a bar + `done/total · N%`. Quick "+ task" add. Custom `ProjectView.tsx` + `actions.ts`.
- [x] **Next action + deadline** — a single "next action" string surfaced as the card CTA (inline-editable), plus optional `due_date` rendered as "N days left" / "Due today" / "N days overdue".

**P2**
- **Board view** — columns per status (planning / active / blocked / done) with project cards; move a project between columns (tap-to-advance on phone, drag where it fits). Toggle board ↔ list.
- **Blocked reason + since** — when blocked, capture why and show "blocked 5 days".
- **Sort/filter** by status, deadline, % done.

**P3**
- **Activity / progress history** (reuse `goal_progress`-style log) and per-project notes.
- **Milestones within a project** (sub-grouping of tasks).
- **Hero strip** — counts by status, "N blocked", nearest deadline.

**Data** — Graduate from a single `goals` row. Extend/replace with `projects (id, user_id, title, status, next_action, due_date, note)` + `project_tasks (id, project_id, title, completed, sort_order)` (or reuse `goals` + a `parent_id` child table for tasks and widen `status`). Standard RLS pair on both.

**Schema delta (shipped P1)** — migration `src/supabase/migrations/20260530T0632_projects.sql`. Two new tables, each with the standard owner (`auth.uid() = user_id`) + SysOp-read RLS pair (integrator: fold into `docs/database.md`):
- `projects (id BIGINT IDENTITY PK, user_id UUID FK auth.users ON DELETE CASCADE, title TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'planning', next_action TEXT DEFAULT '', due_date DATE, note TEXT DEFAULT '', created_at TIMESTAMPTZ DEFAULT now())`; index `(user_id, status)`. Valid `status`: `planning | active | blocked | done`.
- `project_tasks (id BIGINT IDENTITY PK, user_id UUID FK auth.users ON DELETE CASCADE, project_id BIGINT FK projects ON DELETE CASCADE, title TEXT NOT NULL, completed BOOLEAN NOT NULL DEFAULT false, sort_order INTEGER NOT NULL DEFAULT 0, created_at TIMESTAMPTZ DEFAULT now())`; index `(project_id, sort_order, created_at)`. Tasks cascade-delete with their project.
- Catalog entry flipped from `ui: "goal"` to `ui: "modern"` (custom page at `src/app/app/projecttracker/`). The legacy `goals` rows with `goal_type='project'` are left untouched (no auto-migration of old data in P1).

**Still open** — P2 (board view, blocked reason + "blocked N days", sort/filter) and P3 (activity history, milestones, hero strip) are not built. The `note` column exists but is not yet surfaced in the UI (reserved for P3 per-project notes).

**Verdict** — **GRADUATE** — a status pipeline + task-driven % + board view is a different shape from one progress bar. Effort **M** (status + tasks + computed %) **/ L** (with the board view).
