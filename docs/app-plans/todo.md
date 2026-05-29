# Todo (`todo`)

**Purpose** — A fast, phone-first task list: capture a task, prioritize it, knock it out.

**Current state** — Custom page. Inline add form with a title field and a 3-level priority toggle (Normal / `!` / `!!`). Active tasks listed; completed tasks collapse under a "Completed (n)" disclosure. Tap the circle to complete (the toggle action already writes `completed_at`), tap `×` to delete with a confirm. Priority `!!`/`!` shows as a colored pill. Empty state present.

**Gaps** — Doesn't meet the quality bar. No hero/stats strip, no visualization, no streak. The biggest miss: **`due_date` and `completed_at` columns already exist but the UI never surfaces them** — there's no scheduling, no overdue/today/upcoming grouping, and the recorded completion time is invisible. You also can't edit a task once created (a typo means delete + re-add), there's no sort, and no notion of a "Today" focus.

**Plan**

**P1 — core / completeness**
- **Wire up due dates.** Add an optional date to the add form (a quick "Today / Tomorrow / +1wk / pick" preset row, not a bare date input). Show overdue tasks in red, today's in cyan, with relative formatting ("Today", "Tomorrow", "in 3 days", "2 days ago").
- **Group + sort active tasks** by due bucket: **Overdue → Today → Upcoming → Someday (no date)**, priority-then-date within each. This is the single highest-impact change.
- **Inline edit** — tap a task title to edit text, priority, and due date in place; an `updateTodoAction`. Removes the delete-and-retype tax.
- **Surface `completed_at`** — show "done 2h ago" on completed rows and use it for the stat strip below.

**P2 — enhancements**
- **Stat strip** — Open / Due today / Overdue / Done today, derived from existing columns (`completed_at` gives "done today").
- **"Today" focus filter** — a one-tap chip that collapses everything except overdue + due-today, for a clean daily worklist.
- **7-day completion chart** — bars of tasks completed per day from `completed_at`, today highlighted; the missing visualization.
- **Lightweight projects/tags** — a `#project` parsed from the title or a small project field, with a filter chip row (recent-first).
- **Manual reorder** within a bucket via a `sort_order` column for same-priority, same-day tasks.

**P3 — delight**
- **Natural-language date entry** — "buy milk tomorrow", "report fri 5pm" parsed on add into title + due_date.
- **Recurring tasks** — "every Monday"; on completion, clone with the next due date.
- **Subtasks / checklist items** under a parent task with a small progress count.
- **Completion streak** — consecutive days you closed at least one task, with gentle microcopy.

**Data** — No new columns needed for P1: `due_date` and `completed_at` already exist and are unused — wiring them up is the whole win. P2 adds `sort_order INT` and an optional `project TEXT` / `tags TEXT[]`. P3 recurring needs a `recurrence TEXT` column and subtasks a `parent_id` self-reference (or a separate `todo_subtasks` table, RLS-scoped).

**Verdict** — **M.** Highest-impact change: **wire up the existing `due_date` column** with overdue/today/upcoming grouping and relative formatting — it transforms a flat list into a real planner with zero schema work.
