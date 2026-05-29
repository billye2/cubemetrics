# 1-on-1s (`oneononep`)

**Purpose** — Keep running notes per person across recurring 1:1s, with carried-over talking points and action items.

**Current state** — Generic `LogbookView` (`hasTitle: true`, `entryLabel: "Meeting"`). Titled notes in reverse-chron across *all* people mixed together. No per-person view, no continuity between meetings.

**Gaps**
- Notes for all people are interleaved — you can't open "my 1:1s with Jordan."
- No carry-over: talking points you didn't get to vanish instead of leading the next meeting.
- Action items + owners aren't tracked; no "last met" awareness.

**Plan**
- **P1** — Ride the upgraded template for **edit / search / backdate** (see `_logbook-template.md`). App-specific: a **Person** field on every entry and a primary view that **groups notes by person** (a person picker / per-person threads) instead of one flat list. Show **last-met date** per person.
- **P2** — **Talking points carry-over**: unchecked talking points (lines like `[]`) from the last meeting auto-appear at the top of the next note for that person. **Action items with an owner** (me / them), parsed from body markers, with an open-items view per person.
- **P3** — **Recurring cadence** per person (weekly/biweekly) with a "next 1:1 due" nudge when overdue. Per-person summary card (cadence, last met, open actions, open talking points).

**Data** — Rides `logs`. Add `person TEXT` (the grouping key) and optionally `cadence_days INT` (could live in a tiny per-person settings row). Talking points + action items parsed from body markers; carry-over reads the person's previous entry. No heavy new table required, though a `one_on_one_people` table (`user_id, name, cadence_days`) cleanly holds cadence.

**Verdict** — **RIDE** the upgraded template + per-person grouping + carry-over. Effort **M**.
