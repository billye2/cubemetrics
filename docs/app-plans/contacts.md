# Contacts (`contacts`)

**Purpose** — A lightweight personal CRM: keep the people who matter, their details, and a nudge to stay in touch.

**Current state** — Generic `ChecklistView` (`ui: "checklist"`, `itemLabel` "Contact"). A person is reduced to a title you can "check off" and delete. People are not tasks — a checkbox is meaningless here, and there's nowhere to put a phone number, email, or note.

**Gaps** — Every field that makes a contact useful is missing: phone, email, notes, how you know them, when you last spoke. There's no grouping (family / work / friends), no search (mandatory past a handful of people), and no concept of *staying in touch* — which is the only reason a personal contacts app beats your phone's address book. The check-off/collapse-completed UI is entirely wrong for people.

**Plan**

**P1 — make people real (graduate)**
- **Custom page + `actions.ts`** (`ui: "modern"`). A contact card with **name, phone, email, notes**, tap-to-call/`mailto:` links. No checkbox.
- **Tags / groups** (family, work, friends) with a filter chip row.
- **Search** across name/phone/email/notes.

**P2 — the CRM layer**
- **Last-contacted date + "reach out" cadence.** Per contact, an optional cadence (every 2 weeks / monthly / quarterly); a hero list of **"people you're overdue to reach out to"** sorted by most-overdue. This is the differentiator.
- **"Logged a chat" action** that stamps `last_contacted_at = today` in one tap.

**P3 — delight**
- **Birthdays** with an upcoming-birthdays strip (ties nicely to Countdown).
- **Interaction history** (a few recent notes per person) and quick "draft a check-in".

**Data** — **GRADUATE.** New `contacts` table: `id, user_id, name TEXT NOT NULL, phone, email, notes, tags TEXT[], cadence_days INT, last_contacted_at DATE, birthday DATE, created_at`, standard RLS (owner FOR ALL + SysOp SELECT). An optional `contact_log` child table for history (P3).

**Verdict** — **GRADUATE to a custom app. Effort M/L.** People need structured fields, search, and a stay-in-touch cadence — none of which fit a checkbox row. This is the most substantial graduate in the set (mini-CRM); the cadence/overdue layer is what elevates it past a plain address book.
