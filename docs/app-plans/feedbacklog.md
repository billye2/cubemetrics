# Feedback Log (`feedbacklog`)

**Purpose** — Track feedback you've given and received, so reviews and 1:1s have receipts.

> Distinct from the product **Feedback** system app (the in-header feedback→GitHub workflow). This is a personal log of interpersonal feedback.

**Current state** — Generic `LogbookView` (`hasTitle: true`, `entryLabel: "Entry"`). Title + textarea. No direction, no person, no type — so it can't answer "what feedback have I given Sam?"

**Gaps**
- No given-vs-received distinction — the two most important buckets aren't separable.
- No person attached, so you can't pull all feedback involving someone for review season.
- No praise-vs-constructive type and no follow-up tracking, so action items slip.

**Plan**
- **P1** — Ride the upgraded template for **edit / search / date-grouping / backdate** (see `_logbook-template.md`). App-specific: a **Given / Received** toggle (segmented control) and a **Person** field; each card badges direction and shows the person. Search by person.
- **P2** — **Type** chip: Praise vs Constructive (color-coded — cyan praise / amber constructive). **Follow-up flag** with an open-follow-ups view so constructive items don't get dropped. Filter by direction + person + type.
- **P3** — **Per-person rollup** ("3 given, 1 received") feeding a quick "feedback for review season" summary. Optional **link to a 1:1** (`oneononep`) for the same person.

**Data** — Rides `logs`. Add columns: `direction TEXT` ('given'/'received'), `person TEXT`, `feedback_type TEXT` ('praise'/'constructive'), `follow_up BOOL`. (Person could reuse shared `tags`, but a dedicated column makes the per-person rollup clean.) No new table.

**Verdict** — **RIDE** the upgraded template + light structure (direction/person/type/follow-up). Effort **S/M**.
