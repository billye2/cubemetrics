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
| id, user_id, name, email, phone, company, note, tags, created_at, cadence_days, last_contacted |

Backs the **Keep in Touch** app (migration `029_keepintouch.sql`, idempotent, **applied to the remote**). Created ad-hoc earlier and never wired to a UI — note the catalog's "Contacts" *checklist* app stores its rows in the shared `checklists` table (`list_type='contacts'`), **not** here. Migration `029` records the shape, adds `cadence_days INTEGER` (reach out every N days) + `last_contacted DATE`, and adds the SysOp read policy (owner policy `Users can access own contacts` already existed). "Next due" = `last_contacted + cadence_days`; touch-log history + the `note`/`email`/`phone`/`tags` fields are P2. Indexed on `(user_id, last_contacted)`.

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

## RLS Policy Pattern
```sql
ALTER TABLE public.<table> ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users access own rows" ON public.<table> FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "SysOp read access" ON public.<table> FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'sysop'));
```
