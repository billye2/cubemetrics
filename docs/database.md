# Database Schema

## Provider
Supabase PostgreSQL (via Vercel Marketplace)

## Conventions
- All tables in `public` schema
- All user-facing tables have `user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE`
- RLS enabled on every table: users can only access own rows
- SysOp bypass policy on all tables for admin access
- Table names: short, plural nouns (`todos`, `habits`, `expenses`)
- Timestamps: `TIMESTAMPTZ`, defaulting to `now()`
- IDs: `BIGINT GENERATED ALWAYS AS IDENTITY` for app data, `UUID` for user references
- Migration filenames: **new** migrations use a UTC timestamp — `YYYYMMDDTHHMM_<slug>.sql` (e.g. `20260529T1430_recipes.sql`) — so parallel build agents never collide on a sequence number. They sort *after* the legacy `001`–`030` numbered migrations (since `2…` > `0…`), so apply order stays deterministic. The existing `NNN_` files stay as-is; the convention applies going forward. See [agent-orchestration.md](agent-orchestration.md#decision-2--catalog-de-confliction).

## Core Tables

### profiles
Extends `auth.users`.
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | References auth.users |
| handle | TEXT UNIQUE | Display name |
| role | TEXT | 'user' or 'sysop' |
| level | INTEGER | User access level (default 1) |
| total_calls | INTEGER | Login count |
| last_login | TIMESTAMPTZ | |
| first_login | TIMESTAMPTZ | |
| bio | TEXT | |
| location | TEXT | |
| timezone | TEXT | IANA zone (e.g. `America/Los_Angeles`); set from the browser at login. Lets the XP layer compute day boundaries in the user's local day. Added in migration `020`. |

> The classic-only `bbs_sessions` and `activity_log` tables are deprecated and will be dropped by migration `014_drop_classic.sql` (not yet applied to the remote — they still exist).

## App Tables

### todos
| Column | Type |
|--------|------|
| id, user_id, title, completed, priority, due_date, completed_at, created_at, quadrant |

`quadrant SMALLINT` (default `0`, migration `025_todo_quadrant.sql`, **applied to the remote**) backs the Priority Matrix app: `0` unsorted, `1` Do (urgent+important), `2` Schedule (important, not urgent), `3` Delegate (urgent, not important), `4` Drop (neither). Additive with a default — the Todo app is unaffected; both apps share the same rows.

### journal_entries
| Column | Type |
|--------|------|
| id, user_id, entry_date, title, body, mood, created_at |

### calendar_events
| Column | Type |
|--------|------|
| id, user_id, title, description, start_date, start_time, end_date, end_time, recurrence, created_at |

### pomodoro_sessions
| Column | Type |
|--------|------|
| id, user_id, started_at, duration_minutes, completed, completed_at, label, created_at |

### habits + habit_checkins
| habits | habit_checkins |
|--------|---------------|
| id, user_id, name, frequency, active, created_at | id, habit_id, user_id, checkin_date, created_at |

### expenses + expense_categories
| expenses | expense_categories |
|----------|--------------------|
| id, user_id, amount, currency, category, description, expense_date, created_at | id, user_id, name, color, sort_order, created_at |

`expense_categories` (migration `20260530T0508_expense_categories.sql`) replaces the old hard-coded 8-category allowlist with a per-user, color-tagged list that drives the spending-by-category breakdown chart. Existing `expenses.category` TEXT values are left as-is (no row migration); the app seeds the legacy 8 defaults for a user the first time they have none. `UNIQUE (user_id, name)`, indexed on `(user_id, sort_order)`. RLS: owner-only (`Users can access own expense_categories`) plus a SysOp read policy.

### notes
| Column | Type |
|--------|------|
| id, user_id, title, body, tags (TEXT[]), pinned, updated_at, created_at |

### reading_list
| Column | Type |
|--------|------|
| id, user_id, title, author, status, rating, notes, started_at, finished_at, current_page, total_pages, created_at |

`current_page` / `total_pages` (migration `20260530T0502_reading_progress.sql`, both nullable) back the per-book progress bar for "reading" books; `started_at` / `finished_at` are editable.

### user_feedback
| Column | Type |
|--------|------|
| id, user_id, category, body, status, app_id, github_issue_number, github_issue_url, created_at |

RLS scopes reads/writes to the owner only (`Users can manage own feedback`). The classic "Public can read all feedback" policy was removed in migration `015` — the modern UI uses an admin-only review flow instead of a public board. `app_id` tags which catalog app the feedback is about (null = general). `status` flows `new` → `approved` (a GitHub issue was opened; `github_issue_*` populated) → or `rejected`. The admin review queue reads/updates across users via the service-role client (bypasses RLS); see [environment.md](environment.md).

### countdowns
| Column | Type |
|--------|------|
| id, user_id, title, target_date, target_time, category, recurring_yearly, note, created_at |

Backs the Countdown app. `target_date` is a calendar date; `target_time` is optional and combines with the date in local time. `recurring_yearly` marks events that repeat each year (birthdays, anniversaries, holidays) — the "next occurrence" is computed client-side from the original month/day. Indexed on `(user_id, target_date)`.

### counters + counter_events
| counters | counter_events |
|----------|----------------|
| id, user_id, name, value, step, created_at | id, user_id, counter_id, delta, created_at |

Back the Counter / Tally app (migration `023_counters.sql`, **applied to the remote**). `counters.value` is the denormalized running total; `step` is the +/− increment. Every press appends a `counter_events` row (`delta = ±step`) so a counter has history — "today net" (Σ delta on the local day) and a 7-day taps-per-day chart. Resets zero `value` **without** logging an event, so the press metrics stay honest. `counter_events` indexed on `(counter_id, created_at)` and `(user_id, created_at)`.

### contacts
| Column | Type |
|--------|------|
| id, user_id, name, email, phone, company, note, tags, created_at, cadence_days, last_contacted, birthday |

Shared by the **Keep in Touch** and **Contacts** apps (migration `029_keepintouch.sql`, **applied to the remote**; `20260530T0820_contacts_birthday.sql` adds the `birthday DATE` column, idempotent). The catalog's **Contacts** app graduated off the shared `checklists` factory (was `list_type='contacts'`) into a custom mini-CRM backed by this table — address book (name/email/phone/company/note/tags) plus the cadence fields Keep in Touch uses. Migration `029` records the shape, adds `cadence_days INTEGER` (reach out every N days) + `last_contacted DATE`, and the SysOp read policy (owner policy `Users can access own contacts` already existed). The birthday column powers the upcoming-birthdays strip (P3). "Next due" = `last_contacted + cadence_days`. Indexed on `(user_id, last_contacted)`.

### net_worth_accounts + net_worth_snapshots
| net_worth_accounts | net_worth_snapshots |
|--------------------|---------------------|
| id, user_id, name, kind, value, created_at | id, user_id, assets, liabilities, net, captured_on, created_at |

Back the Net Worth app (migration `028_net_worth.sql`, **applied to the remote**). Accounts are named balances tagged `kind` ∈ `asset`/`liability` with a mutable current `value`; net worth = Σassets − Σliabilities computed live. A snapshot freezes the totals on `captured_on` for the trend line (account values overwrite in place — snapshots are the history). Auto-pull from savings/debt is P2. Snapshots indexed on `(user_id, captured_on)`.

### job_applications
| Column | Type |
|--------|------|
| id, user_id, company, role, stage, applied_on, created_at |

Backs the Job Application tracker (migration `027_job_applications.sql`, **applied to the remote**). `stage TEXT` moves through the pipeline `saved` → `applied` → `interview` → `offer` (or `rejected`); `applied_on DATE` is stamped the first time the stage advances past `saved`. Next-action/URL/notes are P2. Indexed on `(user_id, stage)`.

### kanban_cards
| Column | Type |
|--------|------|
| id, user_id, board_type, title, description, column_name, sort_order, priority, created_at |

Backs the Kanban board app. Created ad-hoc earlier (like the factory tables); migration `026_kanban.sql` is **idempotent** and records the shape + adds the conventional SysOp read policy (the owner policy `Users can access own cards` already existed). A card sits on a board (`board_type`, P1 uses a single `'default'`) in a lane (`column_name` ∈ `todo`/`doing`/`done`), ordered by `sort_order` then `created_at`. `description`/`priority`/multiple boards/reorder are P2. Indexed on `(user_id, board_type, column_name, sort_order)`.

### inbox_items
| Column | Type |
|--------|------|
| id, user_id, text, created_at |

Backs the Quick Capture / Inbox app (migration `024_inbox.sql`, **applied to the remote**). Append-only capture; **process-to-zero** — an item exists iff it's still un-triaged. Triaging inserts a row into the destination (`todos`, `notes`, or `checklists` with `list_type='backlog'`) then deletes the inbox row. No status column. Indexed on `(user_id, created_at)`.

### weekly_reviews
| Column | Type |
|--------|------|
| id, user_id, week_start (DATE, Monday of reviewed week), wins, misses, lessons, next_focus, created_at |

Backs the Weekly Review app (migration `20260530T0529_weekly_reviews.sql`). Graduates off the generic `logs` table into a dedicated structured-section model. One review per week per user — `UNIQUE (user_id, week_start)` backs the upsert. RLS: owner `FOR ALL`, plus `SysOp read access` SELECT for `profiles.role = 'sysop'`. Indexed on `(user_id, week_start DESC)`.

### warranties
| Column | Type |
|--------|------|
| id, user_id, name, purchase_date (DATE), warranty_months (INT, default 12), store, note, receipt_url, archived (BOOL), created_at |

Backs the Warranty Tracker app (migration `20260530T0527_warranties.sql`). Graduates off the shared `checklists` table. Expiry is **computed at read time** from `purchase_date + warranty_months`, never stored. RLS: owner `FOR ALL`, plus `SysOp read access` SELECT for `profiles.role = 'sysop'`. Indexed on `(user_id, archived, purchase_date)`.

### vocab_words
| Column | Type |
|--------|------|
| id, user_id, word, definition, example, ease (REAL, default 2.5), interval (INT), reps (INT), due_date (DATE), created_at |

Backs the Vocabulary app (migration `20260530T0533_vocab_words.sql`). Graduates off the checklist template; carries SM-2-lite spaced-repetition fields (`ease/interval/due_date/reps`) — `word` = front, `definition` = back, same review engine as flashcards. RLS: owner `FOR ALL` ("Users access own rows"). Indexed on `(user_id, due_date)`.

### plants + plant_waterings
| plants | plant_waterings |
|--------|-----------------|
| id, user_id, name, frequency_days (INT, default 7), last_watered (DATE, null = never watered/due now), light (TEXT — low/medium/bright), note, photo_url (public Storage URL), fertilize_days (INT, null = off), last_fertilized (DATE), created_at | id, plant_id→plants ON DELETE CASCADE, user_id, watered_on (DATE), created_at |

Backs the Plants app (migrations `20260530T0600_plants.sql`, P3 `20260530T0610_plants_p3.sql`). Graduates off the `checklists` factory into a recurrence model: next-due is **computed** (`last_watered + frequency_days`), never stored; the "Water" action stamps `last_watered = today` to advance it. P3 adds a **second recurrence track** for fertilizing (`fertilize_days` cadence + `last_fertilized`, next-due computed identically), an append-only **watering history** (`plant_waterings`, one row per Water tap, feeds the card sparkline), and a **photo** (`plant-photos` public Storage bucket; `photo_url` holds the public URL, uploads namespaced under `<user_id>/...`). RLS: `plants` + `plant_waterings` both use owner `FOR ALL` + SysOp `FOR SELECT`; Storage `plant-photos` is public-read with owner-only insert/update/delete keyed on the `<user_id>/` folder prefix. Indexes: `plants(user_id, last_watered)`, `plant_waterings(plant_id, watered_on DESC)`.

### recipes + recipe_ingredients + recipe_steps
| recipes | recipe_ingredients | recipe_steps |
|---------|--------------------|--------------|
| id, user_id, name, servings (NUMERIC), prep_min (INT), cook_min (INT), tags (TEXT[] default '{}'), photo_path (Storage object path), notes, created_at | id, recipe_id→recipes ON DELETE CASCADE, qty (NUMERIC), unit (default ''), item, sort (INT) | id, recipe_id→recipes ON DELETE CASCADE, step_no (INT), text |

Backs the Recipes app (migration `20260530T0631_recipes.sql`). Graduates off the `logs` (logbook) factory into a structured model so servings-scaling and cook mode have ingredients/steps as first-class rows. RLS: `recipes` is owner-scoped (`auth.uid() = user_id`) + SysOp `FOR SELECT`; the two child tables are scoped **through** the parent (`EXISTS (SELECT 1 FROM recipes r WHERE r.id = recipe_id AND r.user_id = auth.uid())` for both USING and WITH CHECK), so a user only touches children of recipes they own. Children are rewritten wholesale on save (delete-all + re-insert under `recipe_id`). Indexes: `recipes(user_id, created_at DESC)`, `recipe_ingredients(recipe_id, sort)`, `recipe_steps(recipe_id, step_no)`. **P3** (`20260530T0900_recipes_p3.sql`) adds a **photo** (`recipe-photos` public Storage bucket): `recipes.photo_path` now stores the Storage object path (`<user_id>/<recipe_id>-<ts>.<ext>`), and the page derives the public URL on read. Storage RLS is owner-only insert/update/delete keyed on the `<user_id>/` folder prefix (public-read via the public bucket, so no SELECT policy). No table changes; per-step cook timers and the meal-planner `?id=` deep link are client-only/routing concerns with no schema.

### projects + project_tasks
| projects | project_tasks |
|----------|---------------|
| id, user_id, title, status (default 'planning' — planning/active/blocked/done), next_action (default ''), due_date (DATE), note (default '', reserved P3), blocked_reason (TEXT default ''), blocked_at (TIMESTAMPTZ, stamped on entering `blocked`, cleared on leaving), created_at | id, user_id, project_id→projects ON DELETE CASCADE, title, completed (BOOL default false), sort_order (INT default 0), created_at |

Backs the Projects app (migrations `20260530T0632_projects.sql`, P2 `20260531T0418_projects_blocked.sql`). Graduates the old single-`goals`-row "project" into a status pipeline with a task checklist (% complete derived from tasks done) + a single "next action". P2 adds **blocked context**: `blocked_reason` (free text — why it stalled) and `blocked_at` (stamped when a project moves into `blocked`, cleared when it leaves), so "blocked N days" is honest. Legacy `goals` rows with `goal_type='project'` are left untouched (no auto-migration). RLS: both tables use the standard owner `FOR ALL` ("Users access own rows") + SysOp `FOR SELECT` pair; the new columns inherit the `projects` policies. Indexes: `projects(user_id, status)`, `project_tasks(project_id, sort_order, created_at)`.

### skills + skill_practice + skill_deps
| skills | skill_practice | skill_deps |
|--------|----------------|------------|
| id, user_id, name, category (default 'General'), xp (INT default 0, CHECK ≥ 0), created_at | id, user_id, skill_id→skills ON DELETE CASCADE, xp (INT, CHECK > 0), minutes (INT), note (default ''), created_at | id, user_id, skill_id→skills ON DELETE CASCADE, requires_skill_id→skills ON DELETE CASCADE, min_level (INT default 1, CHECK ≥ 1), created_at; CHECK skill_id≠requires_skill_id; UNIQUE (skill_id, requires_skill_id) |

Backs the Skill Tree app (migration `20260530T0700_skills.sql`). Graduates the old single-`goals`-row "skill" checkbox into a leveling system: each skill accumulates `xp`; level is **derived** from a threshold curve in app code (not stored). `skill_practice` is an append-only log of practice sessions that grant XP; `skill_deps` are edges (a skill requires another at ≥ `min_level`) forming the dependency tree. Child rows cascade on skill delete. RLS: standard owner `FOR ALL` + SysOp `FOR SELECT` pair on all three. Indexes: `skills(user_id, category)`, `skill_practice(skill_id, created_at DESC)`, `skill_deps(skill_id)` + `skill_deps(requires_skill_id)`.

### savings_contributions
| Column | Type | Notes |
|--------|------|-------|
| id, user_id | | PK / owner |
| goal_id | BIGINT | → `goals` ON DELETE CASCADE |
| amount | NUMERIC | one deposit |
| contributed_on | DATE | default `CURRENT_DATE` |
| note | TEXT | default '' |
| created_at | TIMESTAMPTZ | |

Backs the Savings app (migration `20260530T0700_savings_contributions.sql`). Graduates the single-value `goals` row into a finance-shaped app: a savings goal stays a `goals` row (`goal_type='savings'`: title / target_value / due_date / status), and each deposit is one `savings_contributions` row. The goal's `current_value` is **derived** as `SUM(amount)`, preserving deposit history and momentum instead of overwriting a running total (generalizes `goal_progress` into amounts). RLS: standard owner `FOR ALL` + SysOp `FOR SELECT` pair. Indexes: `savings_contributions(goal_id, contributed_on)`, `savings_contributions(user_id, contributed_on)`.

**Savings P3 multi-currency** (migration `20260530T2010_savings_currency.sql`): adds `currency TEXT NOT NULL DEFAULT 'USD'` to the shared **`goals`** table — a per-goal ISO-4217 code, guarded by a `goals_currency_format_chk` CHECK (`^[A-Z]{3}$`). Existing rows default to USD. Additive, no RLS change (`goals` already enforces owner RLS). Used by `Intl.NumberFormat` throughout the Savings app; dashboard totals fold mixed currencies into the most common code.

### objectives + key_results
| objectives | key_results |
|------------|-------------|
| id, user_id, title, cycle (default '', e.g. "Q2 2026"), confidence (default 'on_track' — on_track/at_risk/off_track), created_at | id, user_id, objective_id→objectives ON DELETE CASCADE, title, current_value (NUMERIC default 0), target_value (NUMERIC default 100), sort_order (INT default 0), created_at |

Backs the OKR app (migration `20260530T0700_okr.sql`). Graduates the old single-`goals`-row OKR (a flat title + one target number) into a real objective→key-result hierarchy. An objective is qualitative (no number of its own), tagged with a `cycle` and a manually-set `confidence`; it owns 2–5 key results, each with its own current/target. The objective's score is the **mean of its KR %s** — computed in app code, not stored. `key_results` cascade on objective delete. RLS: standard owner `FOR ALL` + SysOp `FOR SELECT` pair on both. Indexes: `objectives(user_id, cycle)`, `key_results(objective_id, sort_order, created_at)`.

**OKR P2/P3** (migration `20260530T2000_okr_p2_p3.sql`, all additive `ADD COLUMN IF NOT EXISTS`): `key_results` gains `kr_type TEXT NOT NULL DEFAULT 'metric'` (metric number→number / milestone done-not / baseline start→target) and `start_value NUMERIC NOT NULL DEFAULT 0` (baseline shape computes % from `start_value` instead of 0; existing rows keep 0 → identical math). `objectives` gains `status TEXT NOT NULL DEFAULT 'active'` (active|graded for end-of-cycle close), `reflection TEXT NOT NULL DEFAULT ''`, and `graded_at TIMESTAMPTZ`. New child table **`kr_progress`** (`id, user_id, key_result_id → key_results ON DELETE CASCADE, value NUMERIC, created_at`) is an append-only per-KR value history drawn as a sparkline. Standard owner `FOR ALL` + SysOp `FOR SELECT` RLS; indexed `(key_result_id, created_at)`.

### inventory_items
| Column | Type |
|--------|------|
| id, user_id, name, quantity (INT default 1), value (NUMERIC), location, category, photo_url, receipt_url, warranty_url, created_at |

Backs the Inventory app (migration `20260530T0745_inventory_items.sql`). Graduates off the shared `checklists` factory (`list_type='inventory'`) into an attribute-driven possessions model: a thing you own has a quantity, a value, a location and a category — not a task to check off. The headline number is **total worth** = `SUM(value × quantity)` (for insurance), computed in app code. RLS: owner `FOR ALL` ("Users can access own inventory items") + SysOp `FOR SELECT`. Indexed on `(user_id, created_at DESC)`. P3 (migration `20260530T1900_inventory_items_receipt_warranty.sql`) adds optional `receipt_url` / `warranty_url` per item (reference links for the insurance export); both nullable, no RLS change (inherits the base policies).

### meal_plan
| Column | Type |
|--------|------|
| id, user_id, date (DATE), slot (TEXT — breakfast/lunch/dinner), meal (TEXT), recipe_id (BIGINT → `recipes` ON DELETE SET NULL), created_at; UNIQUE (user_id, date, slot) |

Backs the Meals app (migration `20260530T0730_meal_plan.sql`). Graduates off the shared `checklists` factory (was a flat list with `list_type='meal'`) into a real week grid: one row per (date, slot) assignment. A slot holds a free-text meal name and optionally links to a Recipes row so the grocery generator can pull that recipe's ingredients; `recipe_id` is a nullable FK with `ON DELETE SET NULL` so deleting a recipe leaves the planned meal name intact. RLS: owner `FOR ALL` ("Users access own meal plan") + SysOp `FOR SELECT`. Indexed on `(user_id, date)`.

### file_index
| Column | Type |
|--------|------|
| id, user_id, name, location, type, tags (TEXT[] default '{}'), size_bytes (BIGINT), file_date (DATE), description, created_at |

Backs the File Index app (migration `20260530T0720_file_index.sql`). Graduates off the shared `checklists` factory (`list_type='fileindex'`) into a catalog model: an entry is metadata for retrieval (where a file/document/disk lives), not a task to check off. The point is search + filter across name / location / type / tags / description. RLS: owner `FOR ALL` ("Users can access own file_index") + SysOp `FOR SELECT`. Indexed on `(user_id, created_at DESC)`.

### decisions + decision_options + decision_criteria + decision_scores
| decisions | decision_options | decision_criteria | decision_scores |
|-----------|------------------|-------------------|-----------------|
| id, user_id, question, status, chosen_option_id, rationale, revisit_at (DATE), outcome, created_at | id, user_id, decision_id, label, sort_order, created_at | id, user_id, decision_id, label, weight (1–5), sort_order, created_at | id, user_id, decision_id, option_id, criterion_id, score (1–10), created_at; UNIQUE (option_id, criterion_id) |

Back the **Decisions** app (migration `20260530T0800_decisions.sql`). Graduates off the shared `logbook` factory (a title + text blob couldn't compute a matrix) into a real weighted decision matrix: options are the rows, criteria are weighted columns, and each cell is a score. Weighted score per option = Σ(score × weight); the winner is computed in the app, not stored. P2 records the option actually chosen (`chosen_option_id`, may differ from the computed winner), a `rationale`, a `revisit_at`, and an `outcome`. Children carry `user_id` directly and cascade on decision delete. RLS on all four tables: owner `FOR ALL` + SysOp `FOR SELECT`. Indexed per-child on `(decision_id, …)` and decisions on `(user_id, created_at DESC)`.

### debts + debt_payments
| debts | debt_payments |
|-------|---------------|
| id, user_id, name, original_balance, current_balance, apr, min_payment, status ('active'/'paid'), created_at | id, user_id, debt_id, amount, paid_on (DATE), note, created_at |

Back the **Debt** app (migration `20260530T0815_debts.sql`). Graduates off the shared `goal` factory into a finance-shaped app: a debt is a balance paid DOWN toward $0 (not a bar filled toward a target), carries an `apr` and a `min_payment`, and keeps a payment history so progress is preserved instead of overwriting a running number. `current_balance` = `original_balance − SUM(debt_payments)` floored at 0; per-debt payoff projection + snowball/avalanche strategy are computed in `lib.ts`. RLS on both: owner `FOR ALL` + SysOp `FOR SELECT`. Indexed on `debts (user_id, created_at)`, `debt_payments (debt_id, paid_on)` + `(user_id, paid_on)`.

### clients
| Column | Notes |
|--------|-------|
| id, user_id, name, status ('lead'/'active'/'done'/'lost'), email, phone, value (NUMERIC), next_action, next_action_date (DATE), note, created_at | |

Back the **Clients** app (migration `20260530T0830_clients.sql`). Graduates the old `checklists` "client" list into a real mini-CRM pipeline: each client carries a `status` (lead → active → done/lost), contact info, a project `value`, and a `next_action` + `next_action_date` for due/overdue follow-up surfacing — replacing a binary done/not-done checkbox. RLS: owner `FOR ALL` + SysOp `FOR SELECT`. Indexed on `(user_id, status)` for the grouped pipeline view and `(user_id, next_action_date)` for due surfacing.

### client_events
| Column | Notes |
|--------|-------|
| id, user_id, client_id (→ clients.id, ON DELETE CASCADE), kind (TEXT, default 'status'), from_status, to_status, note, created_at | |

Back the **Clients** P3 per-client activity log (migration `20260530T1130_client_events.sql`). Records lifecycle events — chiefly stage changes (lead → active → done/lost) and client creation — so the pipeline can show a simple history and power a won-vs-lost conversion view. Rows cascade away with the parent client (or user). RLS: owner `FOR ALL` + SysOp `FOR SELECT`. Indexed on `(user_id, client_id, created_at DESC)` so a client's timeline reads cheaply.

### budget_targets
| Column | Notes |
|--------|-------|
| id, user_id, category, planned (NUMERIC ≥ 0), month (DATE, first of month), created_at; UNIQUE (user_id, category, month) | |

Back the **Budget** app (migration `20260530T0900_budget_targets.sql`). Graduates off the generic `finance` factory (a flat payables list) into a purpose-built planned-vs-actual model: the user sets a `planned` amount per category per month, while ACTUALS are read live from the existing `expenses` table (grouped by category + month) — no double entry. Categories are shared with the Expenses app via `expense_categories` (matched by name). One row per `(user, category, month)`. RLS: owner `FOR ALL` + SysOp `FOR SELECT`. Indexed on `(user_id, month)`.

### bookmarks
| Column | Notes |
|--------|-------|
| id, user_id, url, title, tags (TEXT[]), folder, favicon_url, last_opened_at (TIMESTAMPTZ), unread (BOOLEAN, default false), created_at | |

Back the **Bookmarks** app (migration `20260530T0808_bookmarks.sql`; `unread` added by `20260530T1455_bookmarks_unread.sql`). Graduates off the shared `checklists` factory into a purpose-built link locker — a checkbox is the wrong model for a link (bookmarks are *opened*, not *completed*), and the URL has no home on a checklist row. Carries free-form `tags`, an optional coarse `folder`, a cached `favicon_url`, and `last_opened_at` for P3 stale-link surfacing. The `unread` flag (P3 read-it-later) lets a saved link be triaged later via a filter chip + per-row toggle; defaults `false` so existing rows read as already-read, and inherits the base table's RLS. RLS: owner `FOR ALL` + SysOp `FOR SELECT`. Indexed on `(user_id, created_at DESC)`.

## Factory Tables

Five shared tables back the generic template apps. Each row is scoped by `user_id` + a `*_type`
discriminator selecting which catalog app owns it (e.g. `tracker_type = "water"`). Documented in
migration `017_factory_tables.sql` (created ad-hoc earlier; the migration is idempotent and records
the current shape).

| Template  | Table            | Columns |
|-----------|------------------|---------|
| tracker   | `daily_trackers` | `tracker_type, entry_date, value, label, note, created_at` |
| checklist | `checklists`     | `list_type, title, note, completed, sort_order, created_at` |
| logbook   | `logs`           | `log_type, entry_date, title, body, tags, created_at` |
| goal      | `goals`          | `goal_type, title, description, target_value, current_value, unit, status, due_date, created_at` |
| finance   | `finance_items`  | `item_type, name, amount, frequency, category, due_date, paid, note, created_at` |

The P1 template upgrades use: checklist `note`; logbook editable `title/body` + backdated
`created_at`; goal `due_date`/`description`/`unit` (deadlines, "why", increment buttons); finance
`frequency` (recurring monthly/annual totals for subscriptions) + due-date urgency. These columns
already existed on the remote, so the upgrades shipped without a live schema change.

A **sixth factory family — `schedule`** (recurring tasks) was added in migration `030_schedule.sql`:

| Template  | Table             | Columns |
|-----------|-------------------|---------|
| schedule  | `schedule_items`  | `schedule_type, title, interval_days, last_done, note, created_at` |

`next due = last_done + interval_days` (null `last_done` = due now); marking done stamps
`last_done = today` and reschedules. Powers new apps **Car** (`carcare`) and **Meds** (`medication`)
as catalog entries only. Standard RLS pair; indexed `(user_id, schedule_type)`. Design +
re-pointing follow-ups in [app-plans/_schedule-template.md](app-plans/_schedule-template.md).

## XP Layer Tables

Three tables back the XP layer (points / levels / streaks / daily quests / achievements). Defined
in migration `020_xp.sql` — **applied to the remote.** Full design in
[app-plans/_xp-layer-spec.md](app-plans/_xp-layer-spec.md). XP is **derived** from the existing
per-app tables, not emitted per action; these tables hold only the cached rollup and unlock/quest
state. Level, total XP, and streak are aggregates over `xp_daily` and are intentionally **not**
stored.

### xp_daily
| Column | Type | Notes |
|--------|------|-------|
| user_id | UUID | PK part |
| day | DATE | PK part — the user's local day |
| points | INTEGER | total XP earned that day |
| breakdown | JSONB | per-source map, e.g. `{"focus":40,"habits":24,"quests":20}` |
| computed_at | TIMESTAMPTZ | |

Per-user-per-day rollup **cache**. PK `(user_id, day)`. Past days freeze once computed; today is
recomputed on each dashboard load (its source rows are still mutable). Safe to delete and rebuild.
Indexed on `(user_id, day DESC)`.

### xp_achievements
| Column | Type |
|--------|------|
| id, user_id, achievement_key, unlocked_at |

Unlock ledger. `UNIQUE (user_id, achievement_key)` — presence = unlocked; `unlocked_at` drives the
"new!" celebration. `achievement_key` matches a definition in `src/lib/xp/`.

### xp_quests
| Column | Type |
|--------|------|
| user_id, day, quest_key, completed_at |

Daily-quest completion. PK `(user_id, day, quest_key)`. The day's three quests are chosen
deterministically in code (`hash(user + day)`), so this table records only which were completed;
progress is read from `xp_daily.breakdown`.

All three enforce the standard owner-`FOR ALL` + SysOp-`SELECT` RLS pair.

## Spine (cross-app layer)

### app_usage
| Column | Type |
|--------|------|
| user_id, app_id, last_used_at, use_count, pinned |

Per-user app usage signal (Spine Layer 1, migration `20260531T1500_app_usage.sql`, **applied to the
remote**). PK `(user_id, app_id)`. Recency + frequency + explicit pins power "the few apps you use"
on the Today dashboard and a usage-ordered grid. Bumped by the `<TrackUsage>` mount beacon via the
`bump_app_usage(p_app text)` RPC — `SECURITY DEFINER` but scoped to `auth.uid()` and `granted` only to
`authenticated`, so a user can only ever touch their own row. Owner-only RLS (no SysOp policy). Indexed
on `(user_id, last_used_at desc)`.

### notification_prefs
| Column | Type |
|--------|------|
| user_id, email_enabled, morning_enabled, evening_enabled, morning_time, evening_time, streak_save_enabled, ai_insights_enabled |

Opt-in email-digest prefs (Spine Layer 4, migration `20260531T1700_notifications.sql`, **applied to
the remote**). PK `user_id`. **No row = no email** (consent-first); email defaults off. `*_time` are
`TIME`. `ai_insights_enabled` is consumed by Phase 5. Owner-only RLS; the cron reads via the
service-role client.

### notification_log
| Column | Type |
|--------|------|
| id, user_id, kind, local_day, sent_at |

Digest send ledger — idempotency (claim-before-send) + audit. Unique `(user_id, kind, local_day)` so a
digest is sent once per user per local day. `kind` ∈ `morning`/`evening`/`streak_save`. RLS **enabled
with no policy** ⇒ users see nothing; only the service role (cron / unsubscribe routes) touches it.

### today_prefs
| Column | Type | Notes |
|--------|------|-------|
| user_id | UUID | PK |
| focus | TEXT | the user's stated "what matters most"; shown on the Today header |
| ordered_app_ids | TEXT[] | explicit Today order; empty ⇒ usage-based fallback |
| hidden_app_ids | TEXT[] | apps hidden from Today |
| updated_by | TEXT | `'user'` \| `'agent'` (provenance) |
| updated_at | TIMESTAMPTZ | |

Agent Layer **Capability A** — the +XP assistant's writable Today layout override (migration
`20260606T0820_today_prefs.sql`). The assistant's live layout tools upsert this row from natural
language ("focus on fitness, hide journaling"); `resolveTodayApps` reads it (an explicit order wins,
hidden filtered, else the usual `chooseApps`). **Empty/absent ⇒ identical to the pre-existing
usage-based selection**, so it's additive and safe before the migration is applied. Owner-only RLS.

## RLS Policy Pattern
```sql
ALTER TABLE public.<table> ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users access own rows" ON public.<table> FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "SysOp read access" ON public.<table> FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'sysop'));
```
