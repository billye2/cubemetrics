# Shared upgrades — Logbook template

`src/app/app/_factories/LogbookView.tsx` backs every `ui: "logbook"` app (gratitude, meeting,
standup, brainstorm, decisionmatrix, workout, learninglog, weeklyreview, feedbacklog, oneononep,
retro, recipes).

Today it's: a "+ New entry" button → optional title + free-text body → reverse-chronological cards
with read-more and delete. It's a decent journal, but every logbook is *just a text blob*. Several
of these have real structure (workout = exercises/sets, decision = options/criteria, recipe =
ingredients/steps, 1:1 = action items) that a single textarea throws away.

## P1 — make entries findable and editable

- **Edit entries.** Currently you can only add and delete. Logs are long-lived; inline edit of
  title/body is essential.
- **Search.** Free-text search across entries. A meeting/learning log is worthless if you can't
  find last month's note.
- **Date grouping & count.** Group cards by month; show "N entries" and entries-this-week. Cheap,
  and gives a sense of cadence (especially gratitude/standup which are daily).
- **Backdate.** Let `created_at` be set on entry so a missed day can be filled.

## P2 — light structure without leaving the template

- **Tags.** Optional comma tags per entry + tag filter. Add `tags TEXT[]` to `logs`.
- **Prompts.** Per-log-type placeholder prompts instead of the generic "What happened?" (gratitude:
  "Three things you're grateful for…"; standup: "Yesterday / Today / Blockers"; retro:
  "Went well / Didn't / Try next"). Drive from `config`.
- **Markdown rendering** for the body (headings, lists, checkboxes) — turns free text into structure
  cheaply.

## P3 — graduate the structured ones

Some logbooks deserve real schemas and custom UIs:

- **workout** → exercises with sets × reps × weight, per-exercise progression charts, PRs.
- **recipes** → ingredients list + steps + servings + tags + cook time; "cook mode".
- **decisionmatrix** → options × weighted criteria scoring grid with a computed winner.
- **weeklyreview** → structured template (wins / misses / next week) pulling in the week's data
  from other apps.

These are flagged in their own files.

## Data

`logs` has `title, body, created_at`. P1 needs only edit actions + backdated `created_at`. P2 adds
`tags TEXT[]`. The graduated apps (workout, recipes, decisionmatrix) need their own tables.

## Verdict

Upgrade the template (edit + search + grouping + prompts) to lift all twelve immediately. Then
graduate the four genuinely-structured logs (workout, recipes, decisionmatrix, weeklyreview) to
custom apps over time.
