# Writing (`writingtracker`)

**Purpose** — Track words written per day and build a writing habit toward a project total.

**Current state** — Rides the generic `TrackerView`. Config: `trackerType: "writing"`, `unit: "words"`, `min 0`, `max 100000`, `aggregate: "sum"`. Sum is correct — multiple sessions add up to the day's word count.

**Gaps (specific to writing)**
- No **daily word goal** (e.g. 500/day), the core of any writing habit.
- No **streak emphasis** — writing is a chain-don't-break habit; the streak should be front and center.
- No **cumulative total toward a project target** (NaNoWriMo-style 50k) — the long-haul motivator.
- No sense of **words-per-session** when multiple entries land in a day.

**Plan**
- **P1**
  - Rides shared upgrades — see [`_tracker-template.md`](_tracker-template.md) (chart, sum aggregation, stats, streak already present).
  - **Daily word goal** (`config.dailyGoal: 500`): goal line on the chart, today's progress ring/percent, "X words to go."
  - Promote the **writing streak** to a hero-adjacent amber pill ("12-day streak").
- **P2**
  - **Project total**: a running cumulative sum toward a target (e.g. 50,000 words) with a progress bar — "31,200 / 50,000 (62%)." Needs a per-app target value.
  - **Words-per-session** (avg entry size today) in the stats strip.
- **P3**
  - **Pace projection**: at your 7-day average, you'll hit 50k on \<date\>.
  - Best writing day callout; quick-add presets are *not* useful here (counts are arbitrary) — keep the number field but allow backdating.

**Data** — None for daily tracking. **Project target** needs a stored value: either a new `config.projectTarget` (fixed) or a single `goals`-style row if the user should set it. Start with `config.projectTarget` (no DB change).

**Verdict** — **Ride the upgraded template + a project-total bar.** The project cumulative is a small overlay; only graduate if per-project targets must be user-editable. Effort **S/M**.
