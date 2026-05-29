# Workout (`workout`)

**Purpose** — Log training sessions exercise-by-exercise and watch strength progress over time.

**Current state** — Generic `LogbookView` (`hasTitle: true`, `entryLabel: "Workout"`). A title + a textarea. Sets, reps, and weights are stuffed into prose — unqueryable, unchartable, no PRs.

**Gaps**
- No structured exercises/sets, so no volume, no progression, no personal records — the core value of a training log.
- No way to repeat a routine; re-typing the whole session every time.
- No rest timer, no prior-session reference while lifting.

**Plan** — **GRADUATE** to a custom app. This is the biggest logbook graduate.
- **P1** — Start a workout → add **exercises**, each with **sets** of `reps × weight` (and optional RPE). Mobile-first set entry: tap to add a set, prior set's values prefilled. Show **session total volume** (Σ reps × weight) and per-exercise volume. Finish/save the session with a date.
- **P2** — **Per-exercise progression chart** (top-set weight or volume over time) and **personal records** (heaviest weight, best est. 1RM, max reps) badged when beaten. **Workout templates/routines**: save a session as a routine and start a new workout pre-populated with its exercises.
- **P3** — **Rest timer** between sets (persists across reloads via `localStorage`, like Focus). Show **last time** stats for the current exercise inline ("last: 3×8 @ 60kg"). Body-part/tag filter; weekly volume bar chart on the home view.

**Data** — New tables:
- `workouts` (`id, user_id, started_at, note, routine_id?`)
- `workout_exercises` (`id, workout_id, name, sort`)
- `workout_sets` (`id, workout_exercise_id, reps, weight, rpe, sort`)
- `workout_routines` (`id, user_id, name`) + `routine_exercises` for templates.

Standard RLS pair on each, scoped through `workout_id → workouts.user_id`. An `exercises` catalog (per-user names) helps autocomplete + PR aggregation.

**Verdict** — **GRADUATE.** A reference-quality strength app, not a text blob. Effort **L**.
