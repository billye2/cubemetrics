# Gratitude (`gratitude`)

**Purpose** — A daily gratitude journal: jot what you're thankful for, build the habit.

**Current state** — Generic `LogbookView` (`hasTitle: false`, `entryLabel: "Entry"`). A bare textarea, reverse-chron cards, read-more, delete. Nothing distinguishes it from any other log.

**Gaps**
- No prompt — staring at "What happened?" defeats a gratitude practice.
- No sense of *cadence*. Gratitude lives or dies by streak; today there's zero feedback that you've kept it up.
- Easy to double-log or skip a day silently.
- No way to look back warmly (no calendar of "days I showed up").

**Plan**
- **P1** — Ride the upgraded template for edit / search / date-grouping / backdate (see `_logbook-template.md`). App-specific: replace the placeholder with a rotating gratitude **prompt** ("Three things you're grateful for today…", "Who made your day better?", "A small win from today"). Treat the log as **one-entry-per-day**: if today already has an entry, the primary button becomes "Edit today's gratitude" instead of "+ New entry".
- **P2** — **Daily streak** hero (current streak + longest), counting consecutive calendar days with an entry. A **calendar heatmap** (last ~3 months, GitHub-style, cyan intensity) of days you logged — the warm look-back. Stats strip: entries this week, total days, longest streak.
- **P3** — Gentle **evening nudge** (e.g. a banner after 8pm if today is empty: "Take a moment — what went well today?"). Optional: surface a random past entry ("On this day…") above the form.

**Data** — Rides `logs`. Add `tags TEXT[]` (shared) — optional here. Streak + heatmap computed server-side from `created_at` (date-truncated, per-user). No new table.

**Verdict** — **RIDE** the upgraded template + prompt + streak/heatmap layer. Effort **S**.
