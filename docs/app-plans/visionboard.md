# Vision Board (`visionboard`)

**Purpose** — A visual board of aspirations — images and quotes for where you're heading.

**Current state** — Generic ChecklistView, `listType: "vision"`, itemLabel "Vision". A flat text list with checkboxes. Aspirations aren't tasks to "complete" — ticking them off creates the wrong pressure, and a board should feel visual, not like a to-do list.

**Gaps**
- Checkbox/"complete" framing is wrong for aspirational items.
- Text-only — no images or styled quote cards.
- No life-area grouping; no visual arrangement.

**Plan**
- **P1 (light graduate)** — Custom page rendering a **card grid** instead of a checklist. Each card = an image or a quote/affirmation. Drop the checkbox entirely (no completion pressure). Life-area **categories** (Health, Career, Relationships, Travel, Money…) via `section`, with color-coded chips per the design system. See `_checklist-template.md` only for the sections/`section` concept — the row UI is bespoke.
- **P2** — Image upload (Supabase Storage) for image cards; styled quote cards (large centered text, accent border) for text. Filter by life area. Two-column phone-first masonry-ish grid.
- **P3** — Drag-arrange ordering (`position`); a "focus" full-screen slideshow of the board; optional gentle link of a vision to a related Goal/Countdown without imposing checkbox completion.

**Data** — Light graduate; can stay on `checklists` with repurposed columns or move to a `vision_cards` table: `id, user_id, kind ('image'|'quote'), text, image_url, section (life area), position, created_at`. Drop `completed` usage. Standard RLS pair.

**Verdict** — **GRADUATE (light)** to a visual card board; reuse `section` but replace the checklist row with image/quote cards. Effort **M**.
