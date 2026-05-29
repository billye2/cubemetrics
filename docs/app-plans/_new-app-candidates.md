# New App Candidates — Research

Research into what new apps to add to the XP Boost product mix. Method: mapped the current
68-app catalog across its 10 categories, found thin spots and unmet everyday-productivity needs,
then classified each idea by **build cost** — does it ride an existing factory template (just a
catalog entry, near-zero code), need a custom page (meets the standalone quality bar), or warrant
a new template family. Grounded in the existing architecture (`catalog.ts`, the five factory
templates, RSC + Server Actions, phone-first). No external dependencies assumed.

## Coverage map — where we're strong vs. thin

| Category | Today | Thin / missing |
|----------|-------|----------------|
| Time & Focus | focus, timetracker, pomodoro, countdown, stopwatch, meditation, calendar | generic **multi-counter/tally**, world clock, time-zone planner |
| Habits & Wellness | mood, water, sleep, energy, weight, screentime, gratitude, workout, mealplanner, habits | **steps/activity, calories/food log, medication, symptoms, cycle, body measurements, stress** |
| Tasks & Planning | todo, backlog, routines, dailyplanner, weeklyreview | priority/Eisenhower matrix, **quick-capture inbox**, errands |
| Goals & Progress | goals, okr, milestones, streaks, bucketlist, visionboard, skilltree, savings, debtpayoff | reading/fitness **challenges**, year-in-review |
| Notes & Thinking | journal, notes, writing, meeting, standup, brainstorm, decisionmatrix, flashcards | **quotes/commonplace, dream journal**, voice memo |
| Finance | budget, bills, subscriptions, expenses, savings, debtpayoff | **income, net worth, investments, shared/split**, tip & converter utils |
| Learning & Reading | reading, courses, vocabulary, learninglog, skilltree | **watchlist (film/TV), podcast queue**, practice log |
| Organization | grocery, wishlist, bookmarks, contacts, inventory, fileindex | **gift tracker, places/restaurants, loyalty cards**, passwords *(avoid)* |
| Work & Collaboration | feedback, clienttracker, invoices, projecttracker, oneononep, retro, feedbacklog | **job-hunt/applications**, time-off, expenses-for-reimbursement |
| Lifestyle | packing, homemaint, cleaning, plantcare, petcare, warranty, travelplanner, recipes | **car/vehicle log, watch/read-later**, wardrobe |

**Biggest under-served area: Health & Wellness** (tracking *intake* and *medical* data, not just
mood/water), then **finance breadth** (income/net-worth, not just outflows), and **media queues**
(we track books but not film/TV/podcasts).

## A. Quick wins — ride an existing factory template (catalog entry only)

Near-zero code: add an `AppEntry` with `config`. These pad the catalog meaningfully and inherit
the template upgrades already planned.

**Tracker template** (one number/scale per day; pick `aggregate`):
- **steps** — daily step count (`unit: steps`, sum, dailyGoal 8000). *Manual entry; see caveat.*
- **caffeine** — mg or cups/day (sum, goal as ceiling).
- **alcohol** — drinks/day (sum, lower-is-better) — pairs with a "dry days" streak.
- **calories** — kcal/day (sum, goal).
- **stress** — 0–5 scale (average) — sibling of mood/energy.
- **pain** — 0–10 scale (latest) — simple symptom severity.
- **steps/pushups/reps** — daily rep counter (sum).
- **productivity** — rate your day 0–5 (average).

**Checklist template** (title + the planned note/section/due-date upgrades):
- **watchlist** — films/shows to watch *(interim; the custom version in B is better)*.
- **places** — restaurants/spots to try, by city (section = city).
- **errands** — quick out-and-about list (due dates).
- **giftideas** — gift ideas per person (section = person) — distinct from wishlist (for self).
- **affirmations** — daily affirmations to read.

**Logbook template** (title + free text, planned tags/prompts):
- **dreamjournal** — dated dream entries (no title, prompt-led).
- **tasting** — coffee/wine/beer tasting notes (rating + notes).
- **foodjournal** — what you ate + how you felt (text; lighter than a calorie log).
- **interviews** — job-interview debriefs (title = company).

**Goal template** (target + the planned deadline/history upgrades):
- **challenge** — a time-boxed challenge (75-hard, 30-day, reading challenge) with a target + deadline.

**Finance template** (the planned recurrence/urgency upgrades):
- **income** — money *in*, by source (mirror of bills; sum, monthly total).
- **loans** — balances owed/lent (sibling of debtpayoff for simple cases).

> ~15 apps for the price of catalog entries. Highest-value of these: **steps, caffeine, stress,
> watchlist, places, giftideas, dreamjournal, income, challenge.**

## B. New standalone custom apps (build to the quality bar)

Distinctive enough to deserve a dedicated page (hero / stats / chart), like Focus & Countdown.

1. **Counter / Tally** *(time/org)* — multiple named counters with +/- and history. The classic
   "missing primitive": habit reps, head-counts, inventory ticks, anything. Tiny to build, broadly
   useful, very phone-friendly. **Effort S. High utility-per-effort.**
2. **Watchlist** *(learning)* — films & shows like the Reading app: to-watch / watching / seen,
   star ratings, where-streaming, notes. Reuses the Reading pattern almost wholesale. **Effort M.**
3. **Medication / Pill tracker** *(habits)* — scheduled doses, daily "taken" check-off, adherence %
   and streak, refill reminder. Needs the recurring engine (see D). **Effort M.**
4. **Net Worth** *(finance)* — assets − liabilities snapshot over time with a trend line; can read
   from savings/debt/investments. Anchors the whole finance suite. **Effort M.**
5. **Cycle tracker** *(habits)* — period/cycle calendar with predictions; calendar-style custom UI.
   **Effort M.** *(Sensitive data — RLS-only, no sharing.)*
6. **Keep-in-touch** *(org/work)* — people + desired contact cadence, surfaces "overdue to reach
   out," logs last contact. The relationship-CRM the `contacts` graduate hints at. **Effort M.**
7. **Body measurements** *(habits)* — multiple measures (waist/arms/etc.) over time; multi-series
   chart — the one thing the single-value tracker template can't do. **Effort M.**
8. **Quick calculators** *(utility)* — tip split, unit/currency convert, percentage, loan payment.
   Stateless utilities; a low-effort "always handy" surface. **Effort S/M.**

## C. Brand-defining: the **XP layer**

The product is *XP Boost* but nothing actually awards XP. The strongest single addition is a
**meta-layer that turns activity across all apps into points, levels, and achievements**:

- **XP & Levels dashboard** — every logged action (a focus session, a habit check-in, a workout,
  a todo done) grants XP; show level, daily XP, and a streak that spans the whole suite.
- **Daily Quests** — 3 rotating goals ("log water 3×", "one 25-min focus", "close 5 todos").
- **Achievements / Badges** — milestone unlocks (first 7-day streak, 100 focus hours).

This needs an events/XP table and a small rules engine reading existing tables, but it's the most
on-brand feature and the thing that makes 68 disparate apps feel like *one product*. **Effort M/L,
highest strategic value.**

## D. Architectural opportunity: a **Recurring/Schedule template** (6th family)

A recurring pattern keeps recurring: **bills, subscriptions, cleaning, homemaint, plantcare,
petcare, routines, medication, warranty** all need "this repeats every N days/weeks/months, show
me what's due, let me mark it done, track the streak/last-done." Today each reinvents it.

A shared **`schedule` template** (item + interval + last-done → next-due, "due today" view, history)
would (a) properly power half a dozen existing lifestyle/finance apps and (b) make medication,
car-service, and similar new apps catalog-entry cheap. Worth designing before building the recurring
apps individually. **Effort M to build the template; then many apps become near-free.**

## Productivity-theme curation

The catalog should stay anchored to **productivity** — getting things done, managing time, work
output, focus, planning, learning efficiency, and life-admin that clears mental load. That reframes
the list: lead with the productivity-native apps, treat health/wellness as supporting (the suite
already has mood/water/sleep, so a *few* more are fine), and drop the lifestyle/entertainment ones.

**Off-theme — cut or park** (good apps, wrong product): Watchlist, Cycle tracker, Body
measurements, Dream journal, Tasting notes, Food journal, Places to try, Gift ideas, Affirmations,
and the wellness-only trackers beyond one or two. These dilute a productivity identity.

**Productivity-native apps I under-weighted in the first pass — promote these:**

- **Quick Capture / Inbox** *(tasks, custom, S/M)* — one frictionless box to dump any thought,
  then triage each into Todo / Notes / Backlog / Calendar. The GTD "capture" primitive the suite
  is missing; it makes every other tasks app stickier.
- **Priority Matrix (Eisenhower)** *(tasks, custom, S/M)* — urgent×important quadrants you drag
  todos into. Classic productivity tool; can read the existing `todos` table.
- **Kanban board** *(work, custom, M)* — the proper home for `projecttracker`'s graduation:
  columns (To do / Doing / Done) with cards. The most-requested productivity view we lack.
- **Job Application tracker** *(work, custom/checklist, M)* — roles with stage pipeline (applied →
  screen → onsite → offer), next action, dates. High-intent, very productivity.
- **Brag / Wins doc** *(work, logbook entry, XS)* — log accomplishments for reviews/résumés;
  catalog-entry cheap on the logbook template, strong career-productivity payoff.
- **Time-off / Work-hours** *(work, custom/finance-ish, M)* — PTO balance + logged work hours;
  life-admin that professionals actually track.

## Prioritized shortlist (productivity-curated)

| # | App | Bucket | Effort | Why it fits the productivity theme |
|---|-----|--------|--------|------------------------------------|
| 1 | **XP & Levels + Quests** | C | M/L | On-brand productivity gamification; unifies the suite |
| 2 | **Quick Capture / Inbox** | B | S/M | The missing GTD primitive; feeds todo/notes/backlog |
| 3 | **Counter / Tally** | B | S | Missing utility primitive; reps, counts, tallies |
| 4 | **Recurring/Schedule template** | D | M | Powers bills/cleaning/maintenance + new recurring tasks |
| 5 | **Priority Matrix (Eisenhower)** | B | S/M | Classic prioritization; reuses `todos` |
| 6 | **Kanban board** | B | M | Real project view; graduates `projecttracker` |
| 7 | **Job Application tracker** | B/A | M | High-intent work productivity |
| 8 | **Brag/Wins doc, Interviews, Income, Challenge** | A | XS | Catalog-entry productivity/career/finance apps |
| 9 | **Net Worth** | B | M | Money management = life-admin productivity |
| 10 | **Keep-in-touch** | B | M | Professional networking cadence; revives `contacts` |

Supporting (keep to a few, not a wellness sprawl): **steps, caffeine, stress, productivity-rating**
as catalog-entry trackers; **Medication** only if the recurring template (D) lands first.

## Deliberately avoid

- **Passwords / secret storage** — security liability on a public-repo hobby app; users have
  dedicated managers.
- **Auto step/heart-rate/sleep capture** — needs native device sensors we can't access from the
  web; offer **manual** entry only and say so.
- **Anything needing push notifications** as the core value (meds, bill reminders) until a
  notification channel exists — design for in-app "due today" surfaces first.
- **More single-value health trackers than people will use** — ship the high-signal few
  (steps/caffeine/stress/calories), not twenty.

## How to aim the next round

Three different bets, pick the lane:
- **Breadth/quick:** ship Section A (~15 catalog-entry apps) in one pass — fast catalog growth.
- **Brand/depth:** build the XP layer (C) + Counter (B) — make the suite feel like one product.
- **Foundation:** build the recurring/schedule template (D), then meds + car log + fix the
  lifestyle apps on top of it.

I'd sequence: **D (template) → A (quick wins) → C (XP layer)** so each step makes the next cheaper.
A competitive web scan of trending 2026 productivity apps can be added if you want outside signal;
this doc is grounded in catalog-gap analysis and product fit.

**Curation rule going forward:** evaluate each candidate against "does this help someone get things
done / manage time / clear mental load?" Wellness and lifestyle apps already in the catalog stay,
but new additions should earn their place on the productivity theme — keep the identity sharp rather
than becoming a generic life-tracker grab-bag.
