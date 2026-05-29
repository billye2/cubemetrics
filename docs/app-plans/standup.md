# Standups (`standup`)

**Purpose** — Daily standup notes: what you did, what you'll do, what's blocking you.

**Current state** — Generic `LogbookView` (`hasTitle: false`, `entryLabel: "Standup"`). One textarea — the classic Yesterday/Today/Blockers shape is lost in free text.

**Gaps**
- No structure: every standup is unstructured prose, so they're inconsistent and hard to skim.
- No daily cadence feedback — standups are by definition daily.
- The whole point is to *paste it into Slack/standup channel*, and there's no clean way to copy.

**Plan**
- **P1** — Ride the upgraded template for **edit / search / date-grouping / backdate** (see `_logbook-template.md`). App-specific: a **structured prompt** that pre-fills the body with the three-section template:
  ```
  Yesterday:
  Today:
  Blockers:
  ```
  Markdown rendering (shared P2) makes these render as headed sections. One-entry-per-day cadence like gratitude (button flips to "Edit today's standup").
- **P2** — **Daily streak** hero (consecutive working-day standups) + entries-this-week count. **"Copy to clipboard"** button on each card that emits a Slack-ready plain-text version of the three sections.
- **P3** — Optional **blocker flag**: if the Blockers section is non-empty, badge the card amber so unresolved blockers stand out in history. "Carry forward": pre-seed today's "Yesterday" from yesterday's "Today".

**Data** — Rides `logs`. Structure lives in the body via the seeded template; streak computed from `created_at` dates. No new table.

**Verdict** — **RIDE** the upgraded template with a structured prompt + streak + copy. Effort **S**.
