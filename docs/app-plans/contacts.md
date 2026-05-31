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
- [x] **Interaction history** (a few recent notes per person) and quick "draft a check-in". Each contact card has a **Log** action: jot what you talked about, which records a `contact_log` row *and* stamps `last_contacted = today` (so logging and the cadence layer stay in sync). The card shows a collapsible **history (n)** list of the 3 most recent entries (with per-entry delete), and a **Draft check-in** button that pre-fills a personal opener — mentioning the last topic when there is one. Backed by a new `contact_log` child table.

**Data** — **GRADUATED.** Reuses the existing `public.contacts` table (created in `029_keepintouch.sql`, shared with the Keep-in-Touch app): `id, user_id, name TEXT NOT NULL, phone, email, company, note, tags TEXT[], cadence_days INT, last_contacted DATE, created_at`, standard RLS (owner FOR ALL + SysOp SELECT). Migration `20260530T0820_contacts_birthday.sql` adds `birthday DATE` (idempotent `ADD COLUMN IF NOT EXISTS`; applied to remote). Migration `20260530T1500_contact_log.sql` adds the P3 **`public.contact_log`** child table for interaction history.

**`public.contact_log`** — `id BIGINT identity PK, user_id UUID → auth.users ON DELETE CASCADE, contact_id BIGINT → public.contacts ON DELETE CASCADE, note TEXT NOT NULL DEFAULT '', logged_on DATE NOT NULL DEFAULT today, created_at TIMESTAMPTZ`. Standard owner FOR ALL + SysOp SELECT RLS; index `(user_id, contact_id, created_at DESC)`. Rows cascade away when the parent contact (or user) is deleted.

**Schema delta (for the integrator to fold into `docs/database.md`):**
```sql
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS birthday DATE;

CREATE TABLE IF NOT EXISTS public.contact_log (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_id BIGINT NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  note TEXT NOT NULL DEFAULT '',
  logged_on DATE NOT NULL DEFAULT (now() AT TIME ZONE 'utc')::date,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- owner FOR ALL + SysOp SELECT RLS; index (user_id, contact_id, created_at DESC)
```
The `contacts` table is shared by two catalog apps: **Contacts** (full address book — fields, tags, search, cadence, birthdays, interaction history) and **Keep in Touch** (cadence-only nudge list). `contact_log` is owned by Contacts only.

**Note** — the catalog entry changed `ui: "checklist"` → `ui: "modern"`; the old checklist-backed rows (stored in the shared `checklists` table under `list_type: "contacts"`, if any) are not migrated — the new app reads `public.contacts`.

**Verdict** — **GRADUATE to a custom app. Effort M/L.** People need structured fields, search, and a stay-in-touch cadence — none of which fit a checkbox row. This is the most substantial graduate in the set (mini-CRM); the cadence/overdue layer is what elevates it past a plain address book.
