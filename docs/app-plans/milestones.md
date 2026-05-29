# Milestones (`milestones`)

**Purpose** — Mark and celebrate big life wins as a dated timeline.

**Current state** — Generic `GoalView` (hasTarget **no**, `goalType: "milestone"`). Add a title → no progress bar (no target) → "mark complete" / delete → collapsed completed. So a milestone is just a one-line checkbox: there's no *date* it happened, no chronology, no sense of occasion — exactly the opposite of what a milestone log is for.

**Gaps** — No **achieved date**, so completed milestones have no place on a timeline and can't be ordered by when they happened. No timeline/visual treatment — the defining view for milestones is a vertical dated line, not a to-do list. No celebration on the moment you hit one. No note (the story behind the win) or optional photo. No categories (career / personal / health / travel) to color the line. Completed items get buried in a collapsed section rather than becoming the *highlight reel*.

**Plan** — RIDE the upgraded template, leaning on the date + note shared fields, plus a milestone-specific timeline view.

**P1 — makes it complete**
- **Achieved date** — when marking complete, capture the date it happened (default today, editable, can backdate). Reuse the shared `due_date` as a *target* date and add the achieved date. Cross-cutting deadline/date support: see `_goal-template.md`.
- **Vertical timeline view** — render achieved milestones on a date-ordered vertical line (newest or oldest first toggle), each a node with title + date. This is the headline change and the reason to keep it on the template rather than as a flat list.
- **Note / the story** — a `note` per milestone for context.

**P2 — enhancements**
- **Categories with color** — career / personal / health / travel / money; color the timeline node and allow filtering.
- **Upcoming vs achieved** — split: future target-dated aspirations above the line, achieved below; "next milestone in N days".
- **Year grouping** — section the timeline by year with a count per year.

**P3 — delight**
- **Celebration** on marking achieved (confetti + a badge that persists on the node).
- **Optional photo** — a single image per milestone (Supabase Storage) shown as a thumbnail on the timeline.
- **Share / export** the timeline as an image.

**Data** — Add `achieved_date DATE` and `note TEXT` and `category TEXT` to `goals` (shared `due_date` covers a target date). P3 photo adds `photo_url TEXT` + a Storage bucket. No new table needed for P1/P2.

**Verdict** — **RIDE the upgraded template** — no numeric target needed; the win is dates + a timeline render. Effort **S** (achieved date + timeline + note) with categories/photo as small follow-ons.
