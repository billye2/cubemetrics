# Notes (`notes`)

**Purpose** — A quick scratchpad for ideas, snippets, and lists you want to keep but not schedule.

**Current state** — Custom page. A collapsible "+ New note" form (title optional, body required). Notes render newest-by-`updated_at` as cards split into **Pinned** and **Other** sections; tap the body to expand/collapse long notes ("Read more"), `★` to pin, `×` to delete with confirm. Empty state present.

**Gaps** — The weakest of the custom apps against the bar. **No edit at all** — this is the headline gap; a note is immutable, so a typo or addition means delete and rewrite (and `updated_at` never actually changes since nothing updates). **No search** — no way to find a note among many. **The `tags TEXT[]` column exists but is completely unused** — no tagging, no filtering. No sort options, no stat strip, no visualization. It's a pin-able CRUD list.

**Plan**

**P1 — core / completeness**
- **Edit a note** — inline edit of title + body (tap to enter edit mode, save/cancel), `updateNoteAction` that also bumps `updated_at`. Without this the app barely works as a notepad. Highest-impact gap.
- **Search** — ✅ a search box filters across title + body (client-side over the loaded set).

**P2 — enhancements**
- **Surface & filter tags** — wire up the existing `tags TEXT[]` column: a tag input on the form, tag chips on each card, and a recent-first filter row at the top. Cheap win — the column already exists.
- **Sort control** — Recent (default) / Alphabetical / Pinned-first, as a small segmented toggle.
- **Color labels** — an optional accent color per note (left border / chip) for fast visual grouping; pairs well with tags.
- **Stat strip** — Total / Pinned / Tags, modest but on-bar.

**P3 — delight**
- **Markdown rendering** — render `**bold**`, lists, links, and code blocks in the expanded view (raw in edit mode).
- **In-note checklists** — `- [ ]` items that toggle inline, turning a note into a mini checklist.
- **Folders / notebooks** — group notes beyond tags for users with many.

**Data** — No new columns for the big wins: `tags TEXT[]` already exists (P2) and `updated_at` already exists (edit should set it). Color labels add a `color TEXT`; folders add a `folder TEXT` or a `notebooks` table (RLS-scoped). A GIN index on `tags` if tag filtering grows.

**Verdict** — **M.** Highest-impact change: **add edit + search, then light up the dormant `tags` column.** Edit makes it a real notepad, search makes it scale, and tags are a near-free upgrade since the schema is already there.
