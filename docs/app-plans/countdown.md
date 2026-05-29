# Countdown (`countdown`)

**Status:** Reference app — already built to the quality bar.

**Purpose** — Live countdowns to dated events, with yearly recurrence and adaptive time formatting.

**What it already does well**
- Live ticking (1s interval) with adaptive granularity — "3 months, 2 weeks" far out, "12m 4s" when imminent, calendar-aware breakdown (real months, not 30-day chunks).
- Yearly recurrence that always resolves to the next occurrence at/after now (`nextOccurrence` in `lib.ts`).
- Upcoming vs. "Just passed" sections, sorted by nearest.
- Categories with consistent color dots, recent-first chips, "+ New" affordance.
- Collapsible add form with date, optional time, recurrence toggle, and note.
- Imminent items visually emphasized (emerald, larger); past items dimmed. Inline delete + confirm.
- Backed by `countdowns` (`id, user_id, title, target_date, target_time, category, recurring_yearly, note, created_at`), RLS-scoped.

**Optional polish**

_P2 — enhancements_
- **Edit a countdown** — today it's add/delete only. Allow editing title, date, time, category, recurrence, and note in place (new `updateCountdownAction`) so a moved appointment doesn't require delete-and-retype.
- **Pin / reorder favorites** — let the user pin a few countdowns to the top, independent of the date sort, for the events they check most.
- **Progress bar** — show elapsed-since-`created_at` vs. time-to-go as a thin bar on each card, so a far-off date still feels like it's moving.

_P3 — delight_
- **Per-item color** — let the user pick a color per countdown instead of only the category-derived dot.
- **Milestone notifications** — optional browser Notifications at thresholds ("1 week left", "tomorrow", "today"), gated on permission.
- **Hero / share view** — a focused full-card view of the single nearest countdown (big number, title, date) suitable for screenshotting or pinning.

**Data** — `pin` (boolean) + optional `sort_order` (int) on `countdowns` for pinning/reorder; an optional `color` (text) column for per-item color. All nullable/defaulted, no migration of existing rows needed. Notifications and hero view need no schema.

**Verdict** — Complete; revisit only for the polish above.
