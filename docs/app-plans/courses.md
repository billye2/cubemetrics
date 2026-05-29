# Courses (`courses`)

**Purpose** — Track online courses to completion — modules done, % finished, certificate earned.

**Current state** — Generic `GoalView` (hasTarget **yes**, `goalType: "course"`). A course is a title + a target number you hand-update (e.g. "lessons: 12") with a bar. It works as a blunt progress bar but knows nothing about a course's structure: no modules/lessons, no platform, no deadline, no certificate.

**Gaps** — % is *manually* maintained instead of derived from lessons actually checked off — error-prone and joyless. No **module/lesson checklist** inside the course (the natural unit of progress). No **platform / instructor / URL** metadata (Coursera, Udemy, YouTube…). No **deadline** (self-imposed finish-by date keeps a course from stalling). No **certificate-earned** marker for the payoff. No "resume where I left off" / next-lesson surfacing.

**Plan** — RIDE the upgraded template + add sub-items (lessons) so % is computed.

**P1 — makes it complete**
- **Lessons / modules checklist** — a course owns an ordered list of lessons; tap to check off. **% complete is derived** from lessons done ÷ total (replaces the manual target number; `target_value` becomes lesson count). Quick "+ lesson" add.
- **Deadline** — optional finish-by `due_date` with "N days left" / overdue (cross-cutting; see `_goal-template.md`).
- **Platform + instructor + URL** note fields surfaced on the card; URL as a "Resume" link.

**P2 — enhancements**
- **Next lesson** — surface the first unchecked lesson as the card's call-to-action ("Up next: …").
- **Certificate earned** — a toggle/badge on completion, kept in the completed archive.
- **Progress history** — log lesson completions (reuse `goal_progress`) for a "lessons/week" pace and a sparkline.

**P3 — delight**
- **Time/effort estimate** per course and "est. N hrs left".
- **Categories** (career / hobby / language) with color.
- **Celebration** on finishing + certificate showcase.

**Data** — Add `due_date DATE`, `note TEXT` (platform/instructor/URL) to `goals`. Lessons need a child table: `course_items (id, course_id, title, completed, sort_order)` with the standard RLS pair (or a self `parent_id` on `goals`). Optional `certificate BOOL`.

**Verdict** — **RIDE the upgraded template + lesson sub-items** — the structure (lessons → computed %) is the same parent/child the OKR/projects work introduces, applied lightly. Effort **S** (template P1) **/ M** (with the lesson checklist driving %).
