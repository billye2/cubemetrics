# Bucket List (`bucketlist`)

**Purpose** — Life's big aspirations — places to go, skills to learn, experiences to have — and the joy of ticking them off.

**Current state** — Generic `ChecklistView` (`ui: "checklist"`, `itemLabel` "Goal"). Flat list of aspirations you check off and (jarringly) delete. No categories, no target horizon, no sense of how many dreams you've achieved.

**Gaps** — A bucket list is emotional, not transactional. Checking one off should feel like an *achievement*, not a deletion — there's no "achieved" archive, no count, no celebration. Lifelong dreams sprawl across travel, skills, and experiences with no grouping. There's no place to attach the memory (a photo or note) when you finally do the thing, which is the whole payoff.

**Plan**

**P1 — core**
- Cross-cutting row/progress upgrades: see `_checklist-template.md`.
- **Achieved count + celebration.** A hero "12 of 40 achieved" with a progress bar; a small celebratory state when an item is completed (it's the point of the app). Completed items move to an **Achieved** section, never deleted by default.
- **Categories.** Group by Travel / Skills / Experiences / Other via `section TEXT`.

**P2 — enhancements**
- **Optional target date or age** ("before 30", "2027") via `due_date`, shown as a gentle horizon rather than an overdue alarm.
- **Completion note/photo.** When you achieve an item, capture a one-line memory and optional image URL in `note` — turns the list into a keepsake.

**P3 — delight**
- **Per-category progress** and an "achieved this year" highlight.
- **Random "do this next" nudge** from your unachieved travel/experience items.

**Data** — Add to `checklists`: `section TEXT`, `due_date DATE` (target), `note TEXT` (completion memory + optional image URL). No new table.

**Verdict** — **Ride the upgraded template. Effort S.** This is lifestyle/aspirational, not data-heavy — the template's sections, progress, and a completion note cover it; the differentiator is purely framing/microcopy ("achieved", celebration) over the shared columns.
