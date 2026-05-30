# Contacts (`contacts`)

**Purpose** — A lightweight personal CRM: keep the people who matter, their details, and a nudge to stay in touch.

**Current state** — Generic `ChecklistView` (`ui: "checklist"`, `itemLabel` "Contact"). A person is reduced to a title you can "check off" and delete. People are not tasks — a checkbox is meaningless here, and there's nowhere to put a phone number, email, or note.

**Gaps** — Every field that makes a contact useful is missing: phone, email, notes, how you know them, when you last spoke. There's no grouping (family / work / friends), no search (mandatory past a handful of people), and no concept of *staying in touch* — which is the only reason a personal contacts app beats your phone's address book. The check-off/collapse-completed UI is entirely wrong for people.

**Plan**

**P1 — make people real (graduate)** — ✅ shipped
- [x] **Custom page + `actions.ts`** (`ui: "modern"`). A contact card with **name, phone, email, notes**, tap-to-call/`mailto:` links. No checkbox.
- [x] **Tags / groups** (family, work, friends) with a filter chip row.
- [x] **Search** across name/phone/email/notes (also company).

**P2 — the CRM layer** — ✅ shipped (the table already carried the cadence fields)
- [x] **Last-contacted date + "reach out" cadence.** Per contact, an optional cadence (weekly … yearly); a hero count of **"people you're overdue to reach out to"** sorted by most-overdue. The differentiator.
- [x] **"Logged a chat" action** that stamps `last_contacted = today` in one tap.

**P3 — delight**
- [x] **Birthdays** with an upcoming-birthdays strip (within 30 days, soonest first).
- [ ] **Interaction history** (a few recent notes per person) and quick "draft a check-in". *(needs a `contact_log` child table — not built.)*

**Data** — **GRADUATED.** Reuses the existing `public.contacts` table (created in `029_keepintouch.sql`, shared with the Keep-in-Touch app): `id, user_id, name TEXT NOT NULL, phone, email, company, note, tags TEXT[], cadence_days INT, last_contacted DATE, created_at`, standard RLS (owner FOR ALL + SysOp SELECT). Migration `20260530T0820_contacts_birthday.sql` adds the one missing field: `birthday DATE` (idempotent `ADD COLUMN IF NOT EXISTS`; applied to remote). A future `contact_log` child table would back P3 interaction history.

**Schema delta (for the integrator to fold into `docs/database.md`):**
```sql
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS birthday DATE;
```
The `contacts` table is shared by two catalog apps: **Contacts** (full address book — fields, tags, search, cadence, birthdays) and **Keep in Touch** (cadence-only nudge list). No new table was needed.

**Note** — the catalog entry changed `ui: "checklist"` → `ui: "modern"`; the old checklist-backed rows (stored in the shared `checklists` table under `list_type: "contacts"`, if any) are not migrated — the new app reads `public.contacts`.

**Verdict** — **GRADUATE to a custom app. Effort M/L.** People need structured fields, search, and a stay-in-touch cadence — none of which fit a checkbox row. This is the most substantial graduate in the set (mini-CRM); the cadence/overdue layer is what elevates it past a plain address book.
