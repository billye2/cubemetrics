# Interviews (`interviews`)

**Purpose** — Debrief each interview while it's fresh — who you met, what they asked, how it went,
follow-ups — to prep better for the next round.

**Current state** — Catalog-entry app on the **logbook** template (`logType: "interview"`,
`entryLabel: "Interview"`, `hasTitle: true`, title = company) with a tailored prompt. From
`_new-app-candidates.md` §8. Pairs with the **Job Hunt** pipeline tracker (`jobtracker`).

**Plan**
- **P1** — _shipped (rides the template)_
  - [x] Titled (company), dated, searchable debriefs grouped by month — inherits logbook P1.
  - [x] Per-type prompt added to `LogbookView`'s `PROMPTS` map.
- **P2/P3** — template upgrades ([`_logbook-template.md`](_logbook-template.md)); later, link an
  entry to its `job_applications` row so debriefs sit under the application.

**Data** — Shared `logs` table (`log_type = 'interview'`). No migration.

**Verdict** — **KEEP on the logbook template**; revisit linkage to Job Hunt as a P2.
