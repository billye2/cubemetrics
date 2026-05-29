# Weekly Review (`weeklyreview`)

**Purpose** — A structured weekly retrospective: review wins, misses, and lessons, then set next week's focus.

**Current state** — Generic `LogbookView` (`hasTitle: true`, `entryLabel: "Review"`). Title + textarea. The review's four-part structure is lost, and the week it covers is implicit.

**Gaps**
- No structured sections — reviews come out inconsistent and shallow.
- No notion of *which week* a review covers (just a created date).
- The most valuable input — what actually happened this week across the other apps — isn't pulled in; the user reconstructs it from memory.

**Plan** — **GRADUATE-ish**: keep `logs` but build a custom structured page (or a dedicated table).
- **P1** — A weekly-cadence entry keyed to a **week (date range)**, defaulting to the current ISO week, with **structured sections**: Wins / Misses / Lessons / Next-week focus (each its own textarea, rendered as headed blocks). One review per week; button flips to "Edit this week's review."
- **P2** — **Pull stats from other apps** into the review header for the covered week: habits completed (`habits`), focus minutes (`focus`), todos done (`todos`), time tracked (`timetracker`). Show them read-only at the top so the reflection is grounded in real data.
- **P3** — **Carry forward**: last week's "Next-week focus" appears as a checklist at the top of this week's review ("did you do it?"). Streak of consecutive weeks reviewed; a "missed last week?" nudge.

**Data** — Can ride `logs` (sections stored as one structured body + a `week_start DATE`), or graduate to a `weekly_reviews` table (`id, user_id, week_start, wins, misses, lessons, next_focus, created_at`) — preferred for clean section editing + cross-app joins. Stats are read-only queries against existing app tables; no writes there.

**Verdict** — **GRADUATE-ish** to a structured weekly template with cross-app stats. Effort **M**.
