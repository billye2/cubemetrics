# Wins / Brag doc (`brag`)

**Purpose** — Log accomplishments as they happen so reviews, résumés, and promo packets write
themselves.

**Current state** — Catalog-entry app on the **logbook** template (`logType: "brag"`,
`entryLabel: "Win"`, `hasTitle: true`), with a tailored prompt ("What you shipped or achieved —
impact, numbers, who noticed…"). From `_new-app-candidates.md` §8 (XS, career-productivity).

**Plan**
- **P1** — _shipped (rides the template)_
  - [x] Titled, dated, searchable entries grouped by month — inherits all logbook P1.
  - [x] Per-type prompt added to `LogbookView`'s `PROMPTS` map.
- **P2/P3** — anything from [`_logbook-template.md`](_logbook-template.md) (markdown body, tags).
  App-specific later: tag by skill/project; export a date-range summary for a review.

**Data** — Shared `logs` table (`log_type = 'brag'`). No migration.

**Verdict** — **KEEP on the logbook template.** Strong payoff for a one-line catalog entry.
