# Invoices (`invoices`)

**Purpose** — Track invoices you've sent to clients and what's still owed to you.

**Current state** — Generic `FinanceView` (`itemType: "invoice"`, `hasAmount` + `hasDueDate`, work category). Add name/amount/category/due-date; "paid" checkbox; "Outstanding" total; collapsed Paid section; delete. Hardcodes `$`.

**Gaps** — Invoices are money owed *to* you, not bills to pay, and the binary paid/unpaid model misses the real lifecycle: an invoice is drafted, sent, becomes overdue, then paid. There's no client or project field, so you can't see "what does Acme owe me?" — the free-text name is doing too much. No invoice number for reference. "Outstanding" is right in spirit but there's no "paid this month" (income) counterpart and no aging of receivables (30/60/90 days late), which is exactly what you chase clients on. No link to the existing **clienttracker** app. No export to hand to an accountant.

**Plan** — Ride the upgraded template's due-date/aging/totals work, then add an invoice-specific status pipeline and client field.

**P1 — makes it complete**
- **Status pipeline** instead of a paid checkbox: `draft → sent → paid`, with `overdue` derived when status is `sent` and `due_date` has passed. Status chips on each row; tapping advances/sets status. This replaces the boolean and drives everything below.
- **Client / project field** — a dedicated `client` field (separate from category, which stays for work type). Group the list by client and show a per-client outstanding total — the core "who owes me" view.
- **Two headline totals** — **Outstanding** (sent + overdue) and **Paid this month** (income from `paid_date`), side by side. The single outstanding number alone hides incoming cash.
- **Due-date aging** (see `_finance-template.md`) — sort sent invoices by due date; overdue in red labeled "45 days overdue"; show aging buckets (current / 30 / 60 / 90+).

**P2 — enhancements**
- **Invoice number** — auto-incrementing per-user `invoice_no` shown on each row and used as the reference.
- **Link to clienttracker** — when a client matches a clienttracker entry, deep-link to it; offer client names as quick-pick chips sourced from that app.
- **CSV export** (see template) of the filtered list — number, client, amount, status, dates — for accounting.

**P3 — delight**
- **Recurring/retainer invoices** (see template `recurrence`) — auto-generate a monthly retainer invoice in `draft`.
- **Monthly income trend** — bar chart of paid totals per month from `paid_date`.
- **"Send reminder" copy** — generate a polite overdue-reminder text to paste into email (cross-cutting with any future notifications).

**Data** — Rides `finance_items`. Add `paid_date DATE` + `recurrence TEXT` (shared template). Invoice-specific: `status TEXT` (draft/sent/paid; default 'draft'), `client TEXT`, `invoice_no INTEGER`. All nullable / defaulted, backward-compatible.

**Verdict** — **RIDE the upgraded template + statuses.** The aging/totals/export overlap heavily with template work; the status pipeline + client field are the app-specific layer. Effort **M**.
