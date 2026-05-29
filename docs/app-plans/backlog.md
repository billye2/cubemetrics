# Backlog (`backlog`)

**Purpose** — A someday/maybe parking lot for ideas and tasks that aren't actionable yet — kept out of your active todo list.

**Current state** — Generic `ChecklistView` (`ui: "checklist"`, `itemLabel` "Item"). Flat list you add to, check off, delete. It works as a dumping ground but has no way to triage what's in it or move something into actual work.

**Gaps** — A backlog's value is in *review and promotion*, not check-off. Today there's no priority or tags to sort signal from noise, no nudge to periodically review it (so it rots), and — most importantly — no path from "someday" to "doing": when an item becomes actionable you have to retype it into Todo. Checking an item off in the backlog is ambiguous (done? promoted? abandoned?).

**Plan**

**P1 — triage**
- Cross-cutting row/sort/search upgrades: see `_checklist-template.md`. Search matters as the backlog grows.
- **Tags + priority.** A `tags TEXT[]`/`note`-based tag and a 3-level priority pill so you can filter to "what's worth doing".

**P2 — promotion (the key action)**
- **"Promote to Todo."** A per-row action that inserts the item into the `todos` table (with title and any priority) and removes/marks it here — the backlog feeds your real worklist with one tap, no retyping.
- **Sort by priority / newest / oldest** to resurface stale-but-valuable ideas.

**P3 — delight**
- **Periodic review reminder.** A gentle "you haven't reviewed your backlog in N weeks" nudge (from max `created_at`/a `reviewed_at`), encouraging a regular sweep.
- **Aging signal** — subtly mark items that have sat untouched for months.

**Data** — Add to `checklists`: optional `note`/`tags` and a priority notion (reuse `note` or add a small column). Promotion is a cross-table insert into `todos` from `actions.ts` — no new table needed. A `reviewed_at` column (or derive from activity) enables the review nudge.

**Verdict** — **Ride the upgraded template. Effort S/M.** It's genuinely a list; the differentiator is the **promote-to-Todo** server action (a thin cross-table write) plus tags/priority/search on the shared columns. The S→M bump is the Todo integration, not new infrastructure.
