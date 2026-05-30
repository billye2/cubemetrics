# File Index (`fileindex`)

**Purpose** — A searchable catalog of where your files and documents live — physical folders, drives, cloud paths — so you can find that PDF/scan/disk in seconds.

**Current state** — Generic `ChecklistView` (`ui: "checklist"`, `itemLabel` "File"). Each file is a title you can "check off" and delete. It's not a checklist at all — a file catalog entry is never "completed".

**Gaps** — The entire point is *metadata and retrieval*, and none of it exists: no location/path (the field you actually look up), no type, no tags, no size/date, no description. With no search, a catalog of any size is useless — the check-off and collapse-completed UI actively get in the way.

**Plan**

**P1 — make it a catalog (graduate)** — SHIPPED
- [x] **Custom page + `actions.ts`** (`ui: "modern"`). An entry with **name, location/path, type, description**. Tapping a row shows the full path/details (and a copy-path button), not a checkbox.
- [x] **Search** across name/path/tags/description — the core interaction.
- [x] **Tags** with a filter chip row.

**P2 — organize** — partially shipped
- [x] **Type filter** (doc, photo, video, archive, disk, …) and **sort** by name / date / type (+ recently added).
- [x] **Size & date** fields, displayed and sortable (sort by file date; size shown in detail).
- [ ] **Group by location** (which drive/folder/box) with counts.

**P3 — delight** — partially shipped
- [x] **Quick-open** for cloud paths that are URLs (open in new tab); copy-to-clipboard for local paths.
- [ ] **Bulk import** (paste a directory listing → rows) and a "last verified" stamp for physical media.

**Data** — **GRADUATE-ish.** New `file_index` table: `id, user_id, name TEXT NOT NULL, location TEXT, type TEXT, tags TEXT[], size_bytes BIGINT, file_date DATE, description TEXT, created_at`, standard RLS (owner FOR ALL + SysOp SELECT). (Interim: `checklists` + `note`/`tags`, but it's metadata, not a checklist.)

**Verdict** — **GRADUATE to a custom (catalog) app. Effort M.** It's a metadata index, not a list of tasks — location, type, tags, and search demand real fields and a query-first page. No streaks/charts needed; the bar here is "find anything fast". Medium effort.

---

**Schema delta (shipped)** — migration `src/supabase/migrations/20260530T0720_file_index.sql`. Fold into `docs/database.md` at fan-in:

```sql
CREATE TABLE public.file_index (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  location TEXT,
  type TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}',
  size_bytes BIGINT,
  file_date DATE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- RLS: owner FOR ALL (auth.uid() = user_id) + SysOp FOR SELECT (profiles.role = 'sysop').
-- Index: file_index_user_idx (user_id, created_at DESC).
```

The catalog entry flipped from `ui: "checklist"` (listType `fileindex`) to `ui: "modern"`. Existing interim rows in the shared `checklists` table are not migrated — this is a fresh catalog. Migration must be applied to remote Supabase by the integrator.
