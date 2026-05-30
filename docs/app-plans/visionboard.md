# Vision Board (`visionboard`)

**Purpose** — A visual board of aspirations — images and quotes for where you're heading.

**Current state** — Generic ChecklistView, `listType: "vision"`, itemLabel "Vision". A flat text list with checkboxes. Aspirations aren't tasks to "complete" — ticking them off creates the wrong pressure, and a board should feel visual, not like a to-do list.

**Gaps**
- Checkbox/"complete" framing is wrong for aspirational items.
- Text-only — no images or styled quote cards.
- No life-area grouping; no visual arrangement.

**Plan**
- [x] **P1 (light graduate)** — Custom page rendering a **card grid** instead of a checklist. Each card = an image or a quote/affirmation. Drop the checkbox entirely (no completion pressure). Life-area **categories** (Health, Career, Relationships, Travel, Money…) via `section`, with color-coded chips per the design system. See `_checklist-template.md` only for the sections/`section` concept — the row UI is bespoke.
- [x] **P2 (partial)** — Styled quote cards (large centered text, accent border) and image cards (via URL — Supabase Storage upload still pending). Filter by life area. Two-column phone-first masonry-ish grid (CSS `columns-2` + `break-inside-avoid`). *Remaining:* Storage upload for local image files.
- [ ] **P3** — Drag-arrange ordering (`position`); a "focus" full-screen slideshow of the board; optional gentle link of a vision to a related Goal/Countdown without imposing checkbox completion.

**Data** — Light graduate; moved to a `vision_cards` table (migration `20260530T0540_vision_cards.sql`): `id, user_id, kind ('image'|'quote'), text, image_url, section (life area), position, created_at`. No `completed` column. Standard RLS pair (owner FOR ALL + SysOp read). Index on `(user_id, position, created_at)`.

**Schema delta (applied via migration `20260530T0540_vision_cards.sql`):**
```sql
CREATE TABLE public.vision_cards (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL DEFAULT 'quote' CHECK (kind IN ('quote','image')),
  text TEXT,
  image_url TEXT,
  section TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- RLS: owner FOR ALL (auth.uid() = user_id); SysOp FOR SELECT.
-- Index: vision_cards_user_idx (user_id, position, created_at).
```

**Verdict** — **GRADUATE (light)** to a visual card board; reuse `section` but replace the checklist row with image/quote cards. Effort **M**.
