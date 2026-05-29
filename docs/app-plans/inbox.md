# Quick Capture / Inbox (`inbox`)

**Purpose** — One frictionless box to dump any thought the instant it arrives, then triage each
captured item into the right app later. The GTD "capture" primitive the suite was missing.

**Current state** — Did not exist. Promoted from the new-app shortlist
([`_new-app-candidates.md`](_new-app-candidates.md) — ranked **#2**, "the missing GTD primitive;
feeds todo/notes/backlog"). Built as a custom `modern` app.

**Gaps it fills**
- Every other tasks app assumes you already know where a thought belongs. Capture removes that
  decision at the moment of having the idea — type it, move on, sort later. Makes Todo / Notes /
  Backlog all stickier because there's now a single front door.

**Plan**

- **P1** — _shipped_
  - [x] A prominent **capture box** (autofocused) — type a thought, Enter to save, stays focused
        for rapid serial capture.
  - [x] **Inbox list** of un-triaged items, newest first, with relative-age labels.
  - [x] **Triage each item** in one tap into → **Todo**, **Note**, or **Backlog**; the item is
        consumed (deleted) once routed.
  - [x] **Dismiss** (delete without routing).
  - [x] **Hero** = items left to process, with an "Inbox zero ✓" celebration empty state.
  - [x] **Stats strip**: in inbox, oldest item age.
- **P2** — not yet
  - [ ] Triage to **Calendar** (needs a quick date pick) and to a new **Journal** entry.
  - [ ] Edit an item's text before routing; multi-select bulk triage.
  - [ ] Undo last triage (toast) — recover a mis-routed capture.
  - [ ] Optional: keep a routed-history log instead of hard-deleting.
- **P3** — not yet
  - [ ] Share-target / quick-add from the home header so capture is one tap from anywhere.
  - [ ] Tag/parse `#todo` `!p1` shorthand in the captured text to pre-suggest a destination.

**Data** — New table (migration `024_inbox.sql`):
- `inbox_items` (`id, user_id, text, created_at`). Append-only capture; **process-to-zero** — a
  triaged item is deleted after its destination row is created (Todo→`todos`, Note→`notes`,
  Backlog→`checklists` with `list_type='backlog'`). No status column: an item is in the inbox iff
  the row exists.

Standard RLS pair. Indexed on `(user_id, created_at)`.

**Verdict** — **BUILD (custom).** Tiny surface, outsized workflow value: it's the front door to
the whole tasks suite. Effort **S/M** — shipped to the P1 bar (3 of 4 planned destinations; Calendar
deferred to P2 because it needs a date picker).
