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
Extends `auth.users` with BBS-specific fields.
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | References auth.users |
| handle | TEXT UNIQUE | BBS username |
| role | TEXT | 'user' or 'sysop' |
| level | INTEGER | User access level (default 1) |
| total_calls | INTEGER | Login count |
| last_login | TIMESTAMPTZ | |
| first_login | TIMESTAMPTZ | |
| bio | TEXT | |
| location | TEXT | |

### bbs_sessions
Tracks where each user is in the BBS.
| Column | Type | Notes |
|--------|------|-------|
| user_id | UUID PK | References auth.users |
| current_location | TEXT | e.g., 'main_menu', 'door:todo:add' |
| door_state | JSONB | Ephemeral per-door data |
| last_activity | TIMESTAMPTZ | |

### activity_log
SysOp-viewable system log.
| Column | Type | Notes |
|--------|------|-------|
| id | BIGINT PK | Auto-increment |
| user_id | UUID | References auth.users |
| action | TEXT | e.g., 'login', 'door:todo:add' |
| details | JSONB | |
| created_at | TIMESTAMPTZ | |

## Door Tables (Phase 1)

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

## RLS Policy Pattern
```sql
ALTER TABLE public.<table> ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users access own rows" ON public.<table> FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "SysOp read access" ON public.<table> FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'sysop'));
```
