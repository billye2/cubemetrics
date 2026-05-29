# Retro (`retro`)

**Purpose** — Run team/personal retrospectives: what went well, what didn't, what to try next.

**Current state** — Generic `LogbookView` (`hasTitle: true`, `entryLabel: "Retro"`). Title + textarea. The three-column retro shape is lost, and action items ("try next") don't carry into the following retro.

**Gaps**
- No structured columns — retros come out as undifferentiated prose.
- No team/sprint context to scope a retro.
- "Try next" items evaporate; there's no closing the loop, which is the entire purpose of a retro.

**Plan**
- **P1** — Ride the upgraded template for **edit / search / date-grouping / backdate** (see `_logbook-template.md`). App-specific: a **structured prompt** seeding three sections:
  ```
  Went well:
  Didn't go well:
  Try next:
  ```
  rendered as headed columns (single-column stack on phone) via markdown.
- **P2** — **Team/sprint tag** (shared `tags TEXT[]`) to scope and filter retros by team or sprint. **"Try next" as action items** (lines like `[]`) tracked as checkable.
- **P3** — **Carry forward**: open "Try next" items from the previous retro (same team tag) appear at the top of the new retro as a "did we try these?" checklist — closing the loop. Count of how many "try next" items actually got done.

**Data** — Rides `logs`. Add shared `tags TEXT[]` for team/sprint. Columns + action items live in the structured body (markers parsed); carry-over reads the prior retro with the same tag. No new table.

**Verdict** — **RIDE** the upgraded template with structured columns + carry-over. Effort **S/M**.
