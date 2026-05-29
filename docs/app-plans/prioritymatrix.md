# Priority Matrix — Eisenhower (`prioritymatrix`)

**Purpose** — Sort your real tasks into the four urgent × important quadrants so it's obvious what
to **do now**, what to **schedule**, what to **delegate**, and what to **drop**.

**Current state** — Did not exist. Promoted from the new-app shortlist
([`_new-app-candidates.md`](_new-app-candidates.md) — ranked **#5**, "classic prioritization;
reuses the `todos` table"). Built as a custom `modern` app.

**Gaps it fills**
- The Todo app is a flat list with a numeric priority; it never forces the urgent-vs-important
  distinction that actually drives what to work on. The matrix is the classic lens for that, and it
  works on the *same* tasks — no second to-do system to keep in sync.

**Plan**

- **P1** — _shipped_
  - [x] Reuse the existing `todos` table — a new `quadrant` column (0 = unsorted, 1–4 = the
        quadrants). Tasks created in Todo show up here as **Unsorted** to triage.
  - [x] **2×2 matrix hero**: each cell shows its quadrant (Do / Schedule / Delegate / Drop), a
        colour, and a live count, with urgent/important axis labels.
  - [x] **Unsorted inbox** of un-placed tasks; add a new task straight into the matrix.
  - [x] **Move a task** between quadrants (and back to unsorted) with a compact per-task selector.
  - [x] **Complete** (✓, shared with Todo) and **delete** a task, confirm on delete.
  - [x] **Stats strip**: to triage, important (Q1+Q2), active total.
  - [x] Empty / "all sorted" states and encouraging copy.
- **P2** — not yet
  - [ ] Drag-and-drop between quadrants on larger screens.
  - [ ] Show due-date urgency (auto-suggest "urgent" when `due_date` is near).
  - [ ] Per-quadrant collapse; filter completed; "focus mode" on Q1.
  - [ ] Two-way clarity with Todo (show quadrant chip in the Todo list).
- **P3** — not yet
  - [ ] Coaching nudges ("Q1 is overflowing — schedule or delegate") and a weekly distribution chart.

**Data** — Extends the existing table (migration `025_todo_quadrant.sql`):
- `todos.quadrant SMALLINT NOT NULL DEFAULT 0` — `0` unsorted, `1` Do (urgent+important),
  `2` Schedule (important, not urgent), `3` Delegate (urgent, not important), `4` Drop (neither).
  Additive with a default, so Todo's existing reads/writes are unaffected.

**Verdict** — **BUILD (custom).** A high-value lens over tasks you already have, one column of new
schema. Effort **S/M** — shipped to the P1 bar (tap-to-move; drag is P2).
