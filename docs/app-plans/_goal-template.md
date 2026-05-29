# Shared upgrades — Goal template

`src/app/app/_factories/GoalView.tsx` backs every `ui: "goal"` app (goals, okr, milestones,
streaks, courses, skilltree, projecttracker, savings, debtpayoff).

Today: add a title (+ optional numeric target) → progress bar if target set → "update progress" /
"mark complete" / delete → collapsed completed section. It's a clean single-level
progress-toward-a-number widget. The problem: nine very different mental models are forced through
one shape. OKRs need objectives *with* key results. Streaks need daily check-ins, not a target
number. Savings/debt want currency + a deadline + pace. Skill trees want levels/dependencies.

## P1 — richer progress

- **Deadlines.** Add an optional `due_date`; show "12 days left", sort by urgency, flag overdue.
  Nearly every goal type benefits (courses, savings, debt, projects, milestones).
- **Progress history / sparkline.** Log each progress update (not just the latest value) so you can
  show a trend line and pace ("on track to finish by …"). Today updating progress overwrites the
  number and loses history.
- **Increment buttons.** "+1", "+ custom" quick updates instead of opening the edit field every time.
- **Notes / why.** A description field per goal for the "why" and next action.

## P2 — type-appropriate shapes

- **Key results (OKR).** Let a goal own child key-results, each with its own 0–100%, rolling up to
  the objective. Needs a parent/child relation or a `parent_id`.
- **Sub-tasks / milestones.** For projects and big goals, a checklist of steps inside the card.
- **Pace math for finance goals** (savings/debt): given target + deadline, show "$X/month to hit it"
  and current pace vs. required pace.

## P3 — delight

- **Celebration** on completion (confetti / badge), completed archive with completion dates.
- **Categories/areas** to group goals (health, career, money).
- **Charts**: progress over time, completion rate.

## Data

`goals` has `current_value, target_value, status`. P1 adds `due_date DATE`, `note TEXT`, and a
`goal_progress` history table (`goal_id, value, created_at`) for the trend. OKR/sub-tasks (P2) need
a `parent_id` self-reference or a child table.

## Verdict

Upgrade the template with deadlines + progress history + increments (lifts all nine). Then graduate
the models that don't fit a single progress bar:

- **streaks** → really a habit/check-in app, not a target — graduate (or merge with Habits).
- **okr** → objective + key results hierarchy — graduate.
- **savings / debtpayoff** → currency + deadline + pace + contribution log — graduate (finance-flavored).
- **skilltree** → levels/dependencies/XP — graduate (most distinctive, see its file).
- **projecttracker** → status pipeline + tasks — graduate or fold into a Kanban.

`goals`, `milestones`, `courses` are well-served by the upgraded template.
