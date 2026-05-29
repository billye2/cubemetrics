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

## RLS Policy Pattern
```sql
ALTER TABLE public.<table> ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users access own rows" ON public.<table> FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "SysOp read access" ON public.<table> FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'sysop'));
```
