# Bookmarks (`bookmarks`)

**Purpose** — A personal link locker: save URLs, tag them, find and open them fast.

**Current state** — Generic `ChecklistView` (`ui: "checklist"`, `itemLabel` "Bookmark"). You add a title, "check it off", and delete it. A checkbox on a link is the wrong mental model — bookmarks aren't *completed*, they're *opened*.

**Gaps** — The defining field — the URL — has nowhere to live, so a bookmark is just a title you can't click. There's no way to tag or fold links into folders, no search (the one thing a link locker must do once you have 50+), no favicon/preview to recognize a site at a glance, and tapping a row toggles a meaningless checkbox instead of opening the page. The checklist affordances (complete, collapse-completed) are all dead weight here.

**Plan**

**P1 — make links real (graduate)**
- **Custom page + `actions.ts`** (`ui: "modern"`). Store `url` + `title` (auto-fetched/derived from the URL on add, editable), and tapping a row opens the link in a new tab — no checkbox.
- **Tags.** A `tags TEXT[]` with a filter chip row (recent-first) so links organize themselves.
- **Search.** Title/URL/tag substring filter — essential past ~20 links.

**P2 — enhancements**
- **Favicon / preview.** Show the site favicon (`https://www.google.com/s2/favicons?domain=`) and optionally an OpenGraph title/image for visual recognition.
- **Folders/collections** as a coarser grouping above tags.
- **"Add current" friendliness** — paste a URL, auto-fill title and favicon.

**P3 — delight**
- **Dead-link check** and "last opened" tracking to surface stale bookmarks.
- **Import/export** (paste a list of URLs) and a read-it-later flag.

**Data** — **GRADUATE.** New `bookmarks` table: `id, user_id, url TEXT NOT NULL, title TEXT, tags TEXT[], folder TEXT, favicon_url TEXT, last_opened_at, created_at`, standard RLS (owner FOR ALL + SysOp SELECT). (Interim: could extend `checklists` with `url`/`tags`, but the checkbox semantics make a clean break worthwhile.)

**Verdict** — **GRADUATE to a custom app. Effort M.** A checkbox-on-a-title fundamentally misrepresents a bookmark; URL storage, tags, search, and open-in-new-tab need a purpose-built page and table. Medium effort, high payoff.
