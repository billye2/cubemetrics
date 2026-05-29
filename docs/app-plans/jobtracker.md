# Job Application tracker (`jobtracker`)

**Purpose** — Track every role you're chasing through a clear pipeline — **Saved → Applied →
Interview → Offer** (or Rejected) — so nothing slips and you can see where your search stands.

**Current state** — Did not exist. Promoted from the new-app shortlist
([`_new-app-candidates.md`](_new-app-candidates.md) — ranked **#7**, "high-intent work
productivity"). Built as a custom `modern` app.

**Gaps it fills**
- A job search is inherently a multi-stage pipeline with dates and next actions; a flat list or a
  generic checklist loses the funnel. This is the high-intent, career-productivity tracker the work
  category was missing.

**Plan**

- **P1** — _shipped_
  - [x] Add an application (company + role); starts at **Saved**.
  - [x] **Pipeline stages** — Saved / Applied / Interview / Offer / Rejected — changed with a
        per-row selector; moving to Applied+ auto-stamps the **applied date** if unset.
  - [x] **Funnel hero**: live count at each active stage; **stats strip** (active, interviewing+,
        offers).
  - [x] List sorted by pipeline stage, with company/role, stage badge, and applied date.
  - [x] **Delete** (confirm) and thoughtful empty state.
- **P2** — not yet
  - [ ] **Next action** + follow-up date per application, with an "overdue" surface.
  - [ ] Posting **URL**, salary, location, and a notes field; inline edit of company/role.
  - [ ] Split Interview into Screen / Onsite; per-stage timestamps for cycle-time.
  - [ ] Archive rejected; response-rate / offer-rate stats.
- **P3** — not yet
  - [ ] Reminders for stale applications; contacts/recruiter linkage; import from Inbox capture.

**Data** — New table (migration `027_job_applications.sql`):
- `job_applications` (`id, user_id, company, role, stage, applied_on, created_at`) — `stage TEXT`
  ∈ `saved` / `applied` / `interview` / `offer` / `rejected`; `applied_on DATE` (nullable, stamped
  when the stage first advances past Saved).

Standard RLS pair. Indexed on `(user_id, stage)`.

**Verdict** — **BUILD (custom).** A focused pipeline over a real high-intent workflow. Effort **M** —
shipped to the P1 bar (stage pipeline + funnel; next-action/URL/notes are P2).
