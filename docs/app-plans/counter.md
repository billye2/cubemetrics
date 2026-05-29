# Counter / Tally (`counter`)

**Purpose** — Multiple named counters with one-tap +/− and history. The classic missing
primitive: rep counts, head-counts, scores, inventory ticks, "how many times today" — anything
you'd reach for a hand tally clicker to do.

**Current state** — Did not exist. Promoted from the new-app shortlist
([`_new-app-candidates.md`](_new-app-candidates.md) §B1 — "Effort S, high utility-per-effort, the
classic missing primitive"). Built as a custom `modern` app, not a factory template (none of the
five fit a live-incrementing counter with history).

**Gaps it fills**
- No generic count primitive in the suite — trackers log one daily number per *type*, but you
  can't keep several independent named counters running and just click them.
- Phone-first big-target tap surface: the whole point is a thumb-sized +/− you can hit repeatedly.

**Plan**

- **P1** — _shipped_
  - [x] Create named counters; each has a current **value** and a configurable **step**.
  - [x] Big **+/− buttons** (≥44px, thumb-friendly) that change the value by the step.
  - [x] **Hero**: total presses today across all counters, with a 7-day activity bar chart.
  - [x] **Stats strip**: counters, presses today, busiest counter.
  - [x] Per-counter **"+N today"** net, derived from the event log.
  - [x] **Step picker** (1 / 5 / 10 / custom) per counter.
  - [x] **Rename**, **reset to zero**, and **delete** a counter (confirm on destructive).
  - [x] **History** via a `counter_events` log (one row per delta) → powers today-net + chart.
  - [x] Thoughtful **empty state** and encouraging microcopy.
- **P2** — not yet
  - [ ] Per-counter sparkline / trend over the last N days.
  - [ ] Target value per counter (ring + "12 / 20") and a done state.
  - [ ] Reorder counters (manual sort) and color tags.
  - [ ] Undo last press (toast) instead of relying on −.
- **P3** — not yet
  - [ ] Long-press +/− to add several quickly; haptic feedback.
  - [ ] Group counters into sets (e.g. a scoreboard with several players).
  - [ ] Wire into the **XP layer** as a small source (capped, breadth-only) once we decide
        counters shouldn't be farmable.

**Data** — New tables (migration `023_counters.sql`):
- `counters` (`id, user_id, name, value, step, created_at`) — `value` is the denormalized current
  count (kept in sync with the event sum for cheap reads + simple reset).
- `counter_events` (`id, user_id, counter_id, delta, created_at`) — append-only history; every
  +/−/reset writes a row. "Today net" = Σ delta today; the 7-day chart counts events per local day.

Standard RLS pair on both (`auth.uid() = user_id` FOR ALL + SysOp SELECT). `counter_events`
indexed on `(counter_id, created_at)` and `(user_id, created_at)`.

**Verdict** — **BUILD (custom).** A reference-quality take on the simplest possible primitive:
the value is in how few taps it takes. Effort **S** — shipped to the P1 bar.
