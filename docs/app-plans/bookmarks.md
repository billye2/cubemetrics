# Bookmarks (`bookmarks`)

**Purpose** — A personal link locker: save URLs, tag them, find and open them fast.

**Current state** — Generic `ChecklistView` (`ui: "checklist"`, `itemLabel` "Bookmark"). You add a title, "check it off", and delete it. A checkbox on a link is the wrong mental model — bookmarks aren't *completed*, they're *opened*.

**Gaps** — The defining field — the URL — has nowhere to live, so a bookmark is just a title you can't click. There's no way to tag or fold links into folders, no search (the one thing a link locker must do once you have 50+), no favicon/preview to recognize a site at a glance, and tapping a row toggles a meaningless checkbox instead of opening the page. The checklist affordances (complete, collapse-completed) are all dead weight here.

**Plan**

**P1 — make links real (graduate)** ✅ shipped
- [x] **Custom page + `actions.ts`** (`ui: "modern"`). Store `url` + `title` (derived from the URL on add, editable), and tapping a row opens the link in a new tab — no checkbox.
- [x] **Tags.** A `tags TEXT[]` with a filter chip row (recent-first) so links organize themselves. Per-row tag chips are tappable to filter.
- [x] **Search.** Title/URL/host/tag substring filter (every term must match) — essential past ~20 links.

**P2 — enhancements** (partial)
- [x] **Favicon.** Show the site favicon (`https://www.google.com/s2/favicons?domain=`) cached in `favicon_url`. (OpenGraph title/image preview not done.)
- [x] **Folders/collections** as a coarser grouping above tags — stored in `folder`, shown as a row badge. (No dedicated folder navigation yet.)
- [x] **"Add current" friendliness** — opening the add form now best-effort prefills the URL from the clipboard when it looks like a link (`navigator.clipboard.readText`, gracefully blank if denied). Title still derives from the URL on save. (OpenGraph fetch-on-paste not done.)

**P3 — delight**
- [x] **"last opened" tracking** — `last_opened_at` is stamped on open (groundwork for surfacing stale bookmarks; no dead-link check / stale UI yet).
- [ ] **Dead-link check** to surface stale bookmarks. (Needs server-side fetching — deferred.)
- [x] **Import/export** — an ⇅ panel: paste one URL per line (optional title after a space) to bulk-add (imported rows land as *unread*), or Export copies all links as `url\ttitle` lines to the clipboard. Round-trips through `parseImport`/`toExportText`.
- [x] **Read-it-later flag** — `unread BOOLEAN` (migration `20260530T1455_bookmarks_unread.sql`). Checkbox on the add form, a per-row ◷ toggle, an "Unread N" filter chip, a cyan dot + border on unread rows, and opening an unread link auto-clears the flag.

**Schema delta (shipped)** — migration `src/supabase/migrations/20260530T0808_bookmarks.sql`:
```sql
CREATE TABLE public.bookmarks (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  title TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}',
  folder TEXT,
  favicon_url TEXT,
  last_opened_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- RLS: owner FOR ALL (auth.uid() = user_id) + SysOp SELECT. Index on (user_id, created_at DESC).
```
Catalog flipped `bookmarks.json` from `ui: "checklist"` to `ui: "modern"` (custom page now owns the route). The old `checklists` rows with `list_type = 'bookmark'` are left untouched — this is a clean break, not a data migration.

**Schema delta — read-it-later (P3)** — migration `src/supabase/migrations/20260530T1455_bookmarks_unread.sql`:
```sql
ALTER TABLE public.bookmarks
  ADD COLUMN IF NOT EXISTS unread BOOLEAN NOT NULL DEFAULT false;
```
No RLS change — inherits the base table's owner FOR ALL + SysOp SELECT policies. Existing rows default to read (`false`); imported rows are inserted `unread = true`.

**Data** — **GRADUATE.** New `bookmarks` table: `id, user_id, url TEXT NOT NULL, title TEXT, tags TEXT[], folder TEXT, favicon_url TEXT, last_opened_at, created_at`, standard RLS (owner FOR ALL + SysOp SELECT). (Interim: could extend `checklists` with `url`/`tags`, but the checkbox semantics make a clean break worthwhile.)

**Verdict** — **GRADUATE to a custom app. Effort M.** A checkbox-on-a-title fundamentally misrepresents a bookmark; URL storage, tags, search, and open-in-new-tab need a purpose-built page and table. Medium effort, high payoff.
