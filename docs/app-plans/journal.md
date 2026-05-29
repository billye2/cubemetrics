# Journal (`journal`)

**Purpose** — A private daily journal: write a dated entry, tag it with a mood, look back.

**Current state** — Custom app split across two routes. The list (`JournalView`) shows entries newest-first as cards with date, an optional title, a body preview that expands on tap ("Read more"), a tiny mood pill, and inline delete with confirm. A separate `/app/journal/new` page (`NewEntryForm`) captures title, body, and one of 7 emoji moods, then redirects back. Empty state present.

**Gaps** — Far from the quality bar. **No edit** — once saved, an entry is frozen (delete to fix). **No search** — finding an old entry means scrolling everything. **Mood is captured but never visualized** — it sits as a 10px pill and nothing aggregates it. No writing streak or cadence, no calendar/heatmap of which days you wrote, no hero or stat strip, no prompts to lower the blank-page friction. `entry_date` exists and is rich enough to drive most of this but is only used for the card label.

**Plan**

**P1 — core / completeness**
- **Edit an entry** — reuse the new-entry form on `/app/journal/[id]/edit` (or inline) so title, body, and mood are revisable; `updateEntryAction`. Highest-impact gap.
- **Full-text search** — a search box over title + body (server `ilike` or trigram), with mood-filter chips alongside.

**P2 — enhancements**
- **Writing streak + stat strip** — consecutive-day streak from `entry_date`, plus Entries / This month / Streak. The momentum nudge the reference apps all have.
- **Month calendar heatmap** — a small month grid marking days with an entry (intensity by entry count or word count); the missing visualization and a natural way to navigate.
- **Mood-over-time chart** — map the 7 emoji to a scale and plot mood by `entry_date` (last 30 days), so the captured mood finally pays off.
- **Daily writing prompt** — a rotating prompt on the new-entry page ("What went well today?") to kill the blank-page problem.

**P3 — delight**
- **"On this day"** — surface entries from this date in prior weeks/months/years at the top of the list.
- **Tags** — free-form tags per entry with a filter row (needs a column).
- **Word-count stat** — per-entry count and a "words written this month" total.
- **Export** — download all entries as Markdown / JSON.

**Data** — No new columns for P1/most of P2: `entry_date` and `mood` already exist and drive the streak, heatmap, and mood chart. P3 tags need `tags TEXT[]`. Consider a unique index on `(user_id, entry_date)` only if you want one-entry-per-day semantics — current model allows many, which is fine.

**Verdict** — **M.** Highest-impact change: ship **edit + search + a writing streak** together — edit makes it trustworthy, search makes the archive usable, and the streak turns it from a log into a habit.
