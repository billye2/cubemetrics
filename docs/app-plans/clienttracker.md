# Clients (`clienttracker`)

**Purpose** — A mini-CRM: track clients through a pipeline with next actions and value.

**Current state** — Generic ChecklistView, `listType: "client"`, itemLabel "Client". A flat list of client names you check off. Wrong model entirely — client work is a **status pipeline** with contact info, value, and follow-ups, not a binary done/not-done.

**Gaps**
- No status pipeline (lead → active → done) — only a checkbox.
- No contact info, project value, or next-action/follow-up date.
- No pipeline view or totals.

**Plan**
- **P1 (graduate)** — Custom page. Each client has a **status** (Lead → Active → Done/Lost), contact info (email/phone), project value, a next-action note + date, and free notes. List grouped by status. Hero: count of clients with a next action **due/overdue**.
- **P2** — **Pipeline board**: columns per status (phone-first: collapsible status sections) with per-stage **totals** (count + summed project value). Stats strip: total pipeline value, active count, overdue follow-ups. Sort active clients by soonest next-action date; overdue highlighting per the design system.
- **P3** — Stage-change history / simple activity log per client; won-vs-lost conversion stat; optional link of a follow-up date to the Countdown app.

**Data** — New table `clients` (graduate off `checklists`): `id, user_id, name, status TEXT, email, phone, value NUMERIC, next_action TEXT, next_action_date DATE, note TEXT, created_at`. Standard RLS pair.

**Verdict** — **GRADUATE** to a mini-CRM/pipeline; a checklist can't express status, value, or follow-ups. Effort **M/L**.
