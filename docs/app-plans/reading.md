# Reading (`reading`)

**Purpose** — Track books across to-read / reading / finished, with ratings and notes.

**Current state** — Custom app (`ReadingView.tsx`). Four status tabs (Reading / To Read / Completed / Dropped), each with a live count badge. Collapsible "+ Add book" form (title + author). Each book card has a status dropdown, a 5-star rating (shown only when completed), and expandable/editable notes with read-more truncation. Inline delete + `confirm`. `updateStatusAction` already stamps `started_at` when moved to *reading* and `finished_at` when moved to *completed* — but the UI never displays those dates. Backed by `reading_list` (RLS-scoped), reads in `page.tsx` (last 500), writes in `actions.ts`.

**Gaps** — No stats and no visualization — none of the quality-bar hero/stats/chart elements. `started_at`/`finished_at` are written but never *shown*, and can't be edited (a book added as already-read has no real finish date). For *reading* books there's no progress (current page / %), so an in-progress book is just a title with no momentum. No yearly reading goal, no finished-books timeline, no search, no covers. Rating is completed-only (can't rate a book you're abandoning or re-reading).

**Plan**

**P1 — makes it complete**
- [x] **Progress for "reading" books** — current page / total pages, shown as a thin cyan progress bar with `p.X / Y` + percent on the card; tap to edit. Added `current_page` + `total_pages` columns (migration `20260530T0502_reading_progress.sql`, applied to remote).
- [x] **Surface the dates** — every card shows "Started May 3 · Finished May 28 (25 days)" (whichever exist) and tapping opens `<input type="date">` editors that write `started_at`/`finished_at`, so back-filled books read correctly.

**P2 — enhancements**
- **Stats strip + yearly goal ring** — books finished this year, total pages, average rating; a progress ring against a user-set yearly goal (e.g. 24 books). This is the missing hero/stats layer.
- **Finished-books timeline** — completed books grouped by month/year using `finished_at`, the natural "history" view.
- **Search** across title/author once the list grows.

**P3 — delight**
- **Cover art** via an OpenLibrary / ISBN lookup on add (store a cover URL).
- **Genres / tags** with color chips for filtering.
- **Highlights / quotes** captured per book (separate from freeform notes).
- **Re-read support** — allow rating + a fresh start/finish cycle on an already-completed book.

**Data** — `reading_list` already has `started_at` / `finished_at` (wire into UI + make editable) and `rating` / `notes`. Add `current_page int`, `total_pages int` (nullable) for progress, and optionally `cover_url text`, `genre text`. A yearly goal is one value per user — store in a small `user_settings`/`reading_goals` row or keep client-side first. All additions nullable; no row migration needed.

**Schema delta shipped (P1)** — `20260530T0502_reading_progress.sql`:
```sql
ALTER TABLE public.reading_list
  ADD COLUMN IF NOT EXISTS current_page INTEGER,
  ADD COLUMN IF NOT EXISTS total_pages INTEGER;
```
Both nullable; no backfill. Applied to remote project `aennreackkegaqwwbowg`. (Integrator: fold into `docs/database.md`.)

**Verdict** — **M.** A solid CRUD list missing the entire stats/visualization layer. Highest-impact change: **per-book progress tracking + a yearly goal ring, plus surfacing the started/finished dates already in the table.**
