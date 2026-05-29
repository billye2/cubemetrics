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
| id, user_id, title, completed, priority, due_date, completed_at, created_at |

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

### expenses
| Column | Type |
|--------|------|
| id, user_id, amount, currency, category, description, expense_date, created_at |

### notes
| Column | Type |
|--------|------|
| id, user_id, title, body, tags (TEXT[]), pinned, updated_at, created_at |

### reading_list
| Column | Type |
|--------|------|
| id, user_id, title, author, status, rating, notes, started_at, finished_at, created_at |

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
