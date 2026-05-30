# Plants (`plantcare`)

**Purpose** — Track your houseplants and never forget to water them.

**Current state** — Generic ChecklistView, `listType: "plantcare"`, itemLabel "Plant". A flat list of plant names you check off. Wrong model: watering is recurring and date-driven, not a one-time check that disappears once done.

**Gaps**
- No watering schedule — checking a plant "done" makes no sense for an ongoing task.
- No sense of what needs water *today* or what's overdue.
- No last-watered date, frequency, light needs, notes, or photo.
- No recurrence: a watered plant should reset and reappear when next due.

**Plan**
- **P1 (graduate)** — [x] Custom page. Each plant card shows name, last-watered date, and a computed **NEXT-due** date (last_watered + frequency_days). Highlight rows: red "Overdue", cyan "Today", muted "in N days". A big **"Water"** button stamps `last_watered = today` and advances the next-due date (the recurrence engine). Hero: count of plants needing water today.
- **P2** — [x] "Needs water today" filter view as the default landing tab; "All plants" secondary. Per-plant light level (low/medium/bright) and free-text care notes. Stats strip: total plants, due today, overdue.
- **P3** — [ ] Photo upload (Supabase Storage) on each card; per-plant watering history sparkline; optional fertilizing schedule as a second recurrence track. See `_checklist-template.md` for shared row-structure ideas (note/section) used as an interim before graduating. (`photo_url` column reserved in schema.)

**Data** — New table `plants` (graduate off `checklists`): `id, user_id, name, frequency_days INT, last_watered DATE, light TEXT, note TEXT, photo_url TEXT, created_at`. Next-due is computed (`last_watered + frequency_days`), not stored. Standard RLS pair (owner FOR ALL + SysOp SELECT).

**Schema delta** — `src/supabase/migrations/20260530T0600_plants.sql` creates `public.plants`:
```
id BIGINT GENERATED ALWAYS AS IDENTITY PK
user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE
name TEXT NOT NULL
frequency_days INTEGER NOT NULL DEFAULT 7
last_watered DATE            -- null = never watered (due now)
light TEXT                   -- 'low' | 'medium' | 'bright'
note TEXT
photo_url TEXT               -- reserved for P3
created_at TIMESTAMPTZ NOT NULL DEFAULT now()
```
RLS: owner `FOR ALL` (auth.uid() = user_id) + SysOp `FOR SELECT`. Index on `(user_id, last_watered)`. Catalog entry graduated from `ui: "checklist"` to `ui: "modern"` (dispatched by the dedicated `/app/plantcare` route).

**Verdict** — **GRADUATE** to a custom app with a recurrence engine. The flat-checklist model is fundamentally wrong here. Effort **M**. Shipped P1 + P2.
