# Meetings (`meeting`)

**Purpose** — Capture meeting notes so decisions and action items don't evaporate.

**Current state** — Generic `LogbookView` (`hasTitle: true`, `entryLabel: "Meeting"`). Title + free-text body, reverse-chron cards, delete. No attendees, no actions, no search.

**Gaps**
- Action items get buried in prose and never resurface — the single biggest failure of meeting notes.
- No attendees, so you can't find "every meeting with X."
- No project/topic grouping; no search across months of notes.

**Plan**
- **P1** — Ride the upgraded template for **edit / search / date-grouping / backdate** (see `_logbook-template.md`). App-specific: an **Attendees** field (comma-separated chips stored in `tags` or a dedicated column) shown on each card; search matches title, body, and attendees.
- **P2** — **Action-item extraction**: lines in the body starting with `[]` (or `- [ ]`) are parsed and rendered as a checkable list at the top of the card. Checking one rewrites the body marker to `[x]`. Optional **project/tag** field (reuse shared `tags`) with a tag filter.
- **P3** — **Link to a 1:1 person**: when a meeting is with one person, offer "Open in 1-on-1s" to cross-reference the `oneononep` app. "Push to Todo": send an unchecked action item to the Todo app.

**Data** — Rides `logs`. Add shared `tags TEXT[]` (doubles as project + attendees, or add a dedicated `attendees TEXT[]`). Action items parsed from `body` markers — no schema change needed for P2.

**Verdict** — **RIDE** the upgraded template + light structure (attendees + action-item parsing). Effort **S/M**.
