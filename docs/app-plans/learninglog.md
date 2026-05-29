# Learning Log (`learninglog`)

**Purpose** — Capture what you learned, where you learned it, and revisit it so it sticks.

**Current state** — Generic `LogbookView` (`hasTitle: true`, `entryLabel: "Lesson"`). Title + free-text body, delete. No source link, no topics, no review — so lessons are written once and forgotten.

**Gaps**
- No source/link field, so you can't get back to the article/book/video.
- No topic tagging, so you can't see "everything I've learned about X" or what you focus on.
- Captured-and-forgotten — no resurfacing, which is the whole point of a learning log (spaced recall).

**Plan**
- **P1** — Ride the upgraded template for **edit / search / date-grouping / backdate** (see `_logbook-template.md`). App-specific: a **Source** field (URL or free text — book, course, person) rendered as a link on the card; search matches title, body, and source.
- **P2** — **Topic tags** (shared `tags TEXT[]`) with a tag filter and a **"count by topic"** summary (top topics with counts) so you see where your learning skews. Markdown body (shared) for code snippets/lists.
- **P3** — **"Resurface old lessons"** review: surface a random or oldest-unreviewed lesson ("Still remember this?") with a "reviewed" timestamp to power light spaced repetition. Stats strip: lessons this week, total, distinct topics.

**Data** — Rides `logs`. Add shared `tags TEXT[]` for topics, plus a `source TEXT` column (or fold the URL into the body and parse). P3 needs a `last_reviewed_at TIMESTAMPTZ` column. No new table.

**Verdict** — **RIDE** the upgraded template + source + topics + resurface. Effort **S/M**.
