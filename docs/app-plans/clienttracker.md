# Clients (`clienttracker`)

**Purpose** — A mini-CRM: track clients through a pipeline with next actions and value.

**Current state** — Generic ChecklistView, `listType: "client"`, itemLabel "Client". A flat list of client names you check off. Wrong model entirely — client work is a **status pipeline** with contact info, value, and follow-ups, not a binary done/not-done.

**Gaps**
- No status pipeline (lead → active → done) — only a checkbox.
- No contact info, project value, or next-action/follow-up date.
- No pipeline view or totals.

**Plan**
- [x] **P1 (graduate)** — Custom page. Each client has a **status** (Lead → Active → Done/Lost), contact info (email/phone), project value, a next-action note + date, and free notes. List grouped by status. Hero: count of clients with a next action **due/overdue**.
- [x] **P2** — **Pipeline board**: columns per status (phone-first: collapsible status sections) with per-stage **totals** (count + summed project value). Stats strip: total pipeline value, active count, overdue follow-ups. Sort active clients by soonest next-action date; overdue highlighting per the design system.
- [ ] **P3** — Stage-change history / simple activity log per client; won-vs-lost conversion stat; optional link of a follow-up date to the Countdown app.

**Data** — New table `clients` (graduate off `checklists`): `id, user_id, name, status TEXT, email, phone, value NUMERIC, next_action TEXT, next_action_date DATE, note TEXT, created_at`. Standard RLS pair.

**Schema delta (shipped)** — Migration `src/supabase/migrations/20260530T0830_clients.sql` creates `public.clients`:
`id BIGINT IDENTITY PK, user_id UUID → auth.users ON DELETE CASCADE, name TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'lead' (lead|active|done|lost), email TEXT DEFAULT '', phone TEXT DEFAULT '', value NUMERIC NOT NULL DEFAULT 0, next_action TEXT DEFAULT '', next_action_date DATE, note TEXT DEFAULT '', created_at TIMESTAMPTZ DEFAULT now()`. RLS enabled with the standard owner-`FOR ALL` + SysOp-`FOR SELECT` pair; indexes on `(user_id, status)` and `(user_id, next_action_date)`.

**Implementation** — Custom modern page at `src/app/app/clienttracker/` (`page.tsx`, `actions.ts`, `ClientView.tsx`); catalog entry switched from `checklist` to `ui: "modern"`. The old `checklists` `client` rows are left untouched (the new app reads the `clients` table only).

**Verdict** — **GRADUATE** to a mini-CRM/pipeline; a checklist can't express status, value, or follow-ups. Effort **M/L**.
