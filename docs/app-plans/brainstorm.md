# Brainstorm (`brainstorm`)

**Purpose** — A scratchpad for idea sessions: dump ideas freely, return to the good ones later.

**Current state** — Generic `LogbookView` (`hasTitle: true`, `entryLabel: "Session"`). Titled free-text sessions, reverse-chron, delete. Ideas go in and are never acted on.

**Gaps**
- No tagging, so themed ideas across sessions can't be pulled together.
- Promising ideas die in the log — no path from "idea" to "task/backlog item."
- Related sessions (a multi-day brainstorm) can't be linked.

**Plan**
- **P1** — Ride the upgraded template for **edit / search / date-grouping / backdate** (see `_logbook-template.md`). App-specific: lean into low-friction capture — large autofocus textarea, encourage one idea per line; markdown list rendering (shared P2) so each line becomes a bullet.
- **P2** — **Tags** (shared `tags TEXT[]`) with a tag filter to cluster ideas by theme/project. **Convert an idea to a Todo/Backlog item**: a per-line "→" action that creates a Todo (or `goal`/backlog) row from that line and marks it converted in the body (e.g. strikethrough).
- **P3** — **Link related sessions** (a `related_log_id` reference or a shared tag) so a recurring brainstorm thread is navigable. "Star" standout ideas to a pinned shortlist at the top of the app.

**Data** — Rides `logs`. Add shared `tags TEXT[]`. Convert-to-todo writes to the Todo app's table (cross-app action). Optional `related_log_id BIGINT` for P3 linking.

**Verdict** — **RIDE** the upgraded template + tags + convert-to-task. Effort **S/M**.
