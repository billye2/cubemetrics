# Kanban board (`kanban`)

**Purpose** — Move work across **To do → Doing → Done** on a board, so progress and
work-in-progress are visible at a glance.

**Current state** — Did not exist. Promoted from the new-app shortlist
([`_new-app-candidates.md`](_new-app-candidates.md) — ranked **#6**, "the proper home for
`projecttracker`'s graduation; the most-requested productivity view we lack"). Built as a custom
`modern` app.

**Gaps it fills**
- Todo is a flat list and the Priority Matrix sorts by urgency; neither shows *flow*. A board with
  a **Doing** column makes work-in-progress explicit — the thing that actually drives finishing
  versus starting.

**Plan**

- **P1** — _shipped_
  - [x] A single board with three lanes — **To do / Doing / Done**.
  - [x] **Cards** (title) added straight into any lane via a per-lane add box.
  - [x] **Move a card** between adjacent lanes with ← / → controls (phone-friendly; no drag needed).
  - [x] **Delete** a card (confirm).
  - [x] Phone-first **horizontal scroll-snap board** (swipe between lanes; side-by-side on desktop)
        with per-lane counts.
  - [x] **Hero**: a done/total progress bar; **stats strip** of the three lane counts.
  - [x] Empty states per lane and overall.
- **P2** — not yet
  - [ ] Card **notes/description** + inline edit of the title.
  - [ ] **Multiple boards** (one per project) — the real `projecttracker` graduation.
  - [ ] Manual **reorder within a lane** (`sort_order`) and drag-and-drop on desktop.
  - [ ] WIP limit on **Doing** with a gentle over-limit warning.
- **P3** — not yet
  - [ ] Cycle-time / throughput stats; archive Done; labels & colours per card.

**Data** — New table (migration `026_kanban.sql`):
- `kanban_cards` (`id, user_id, title, lane, created_at`) — `lane SMALLINT` `0` To do, `1` Doing,
  `2` Done. Ordered by `created_at` within a lane (manual reorder is P2).

Standard RLS pair. Indexed on `(user_id, lane, created_at)`.

**Verdict** — **BUILD (custom).** The classic flow view the suite was missing; single-board P1 is a
clean, self-contained ship and the base for the multi-board `projecttracker` graduation. Effort
**M** — shipped to a single-board P1 bar.
