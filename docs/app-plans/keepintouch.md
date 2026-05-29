# Keep in Touch (`keepintouch`)

**Purpose** — Stay in contact with the people who matter on a cadence you set — the app surfaces
who you're **overdue** to reach out to and lets you log each time you do.

**Current state** — Did not exist. Promoted from the new-app shortlist
([`_new-app-candidates.md`](_new-app-candidates.md) — ranked **#10**, "professional networking
cadence; the relationship-CRM the `contacts` graduate hints at"). Built as a custom `modern` app on
the pre-existing (unused) `contacts` table.

**Gaps it fills**
- The catalog's "Contacts" is a flat checklist; nothing tracks *cadence* — how often you mean to
  reach out and whether you're behind. That's the entire value of keeping in touch.

**Plan**

- **P1** — _shipped_
  - [x] People with a **contact cadence** (Weekly / Monthly / Quarterly / Yearly / custom days) and
        a **last-contacted** date.
  - [x] **Due hero** — how many people you're overdue/due to reach out to today.
  - [x] **Due list** first (most overdue on top), with a one-tap **"Reached out"** that stamps
        today and reschedules; then upcoming, then no-cadence contacts.
  - [x] Relative labels ("3d overdue", "due today", "in 2w", "last 10d ago").
  - [x] Add a person (name + cadence + optional company); edit cadence inline; delete (confirm).
  - [x] **Stats strip** (people, due now, in-touch) and empty state.
- **P2** — not yet
  - [ ] A log of past touches (not just the latest date) + a "how we met / notes" field
        (the `note`/`email`/`phone`/`tags` columns already exist on `contacts`).
  - [ ] Snooze a reminder; per-channel (call/email/text); birthdays.
  - [ ] Pull a name in from the Inbox capture or the Contacts checklist.
- **P3** — not yet
  - [ ] Streak of "never let anyone go overdue"; weekly "reach out to N" quest.

**Data** — Extends the pre-existing `contacts` table (migration `029_keepintouch.sql`, idempotent):
- `contacts` already had `id, user_id, name, email, phone, company, note, tags, created_at` (created
  ad-hoc, never wired to a UI — the catalog "Contacts" checklist uses the `checklists` table).
- Adds `cadence_days INTEGER` (how often to reach out) and `last_contacted DATE`; records the shape
  and adds the conventional SysOp read policy (owner policy `Users can access own contacts` existed).

**Verdict** — **BUILD (custom).** Revives a dormant table into the relationship cadence tool the
suite lacked. Effort **M** — shipped to the P1 bar (touch-log history + notes are P2).
