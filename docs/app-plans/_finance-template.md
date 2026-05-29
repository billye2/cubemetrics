# Shared upgrades — Finance template

`src/app/app/_factories/FinanceView.tsx` backs every `ui: "finance"` app (budget, bills,
subscriptions, invoices).

Today: an "Outstanding" total of unpaid items → add (name, amount, category, optional due date) →
paid/unpaid toggle with a collapsed "Paid" section → delete. It's a flat payables list. It does
*not* understand recurrence (subscriptions repeat monthly), budgets (planned vs. actual), totals
over time, or due-date urgency beyond a small date label.

## P1 — money sense

- **Due-date urgency.** Sort unpaid by due date; flag overdue (red) and due-soon (amber); show
  "due in 3 days". Bills and invoices are useless without this.
- **Totals that matter per type.** Budget wants planned-vs-spent and remaining; subscriptions want
  *monthly* and *annual* recurring totals; invoices want outstanding vs. paid this month. The single
  "Outstanding" number is wrong for budget and subscriptions.
- **Category breakdown.** A small bar/pie of amount by category (like Time Tracker's stacked chart).
- **Currency formatting** via `Intl.NumberFormat` (Expenses already does this; Finance hardcodes `$`).

## P2 — recurrence & cadence

- **Recurring items.** `recurrence` (monthly/yearly) + auto-roll: when a subscription/bill period
  passes, regenerate the next instance. Compute "next charge date".
- **Monthly view / history.** Group by month; show this-month total and trend across months.
- **Mark paid → archive with a paid date**, keep history for the trend (don't just hide).

## P3 — delight

- **Reminders** for bills due (needs notifications — note as cross-cutting).
- **Budget rollover** and per-category limits with over-budget warnings.
- **Export** (CSV) for invoices/expenses.

## Data

`finance_items` has `name, amount, category, paid, due_date`. Add `recurrence TEXT`,
`paid_date DATE`, and for budget a `planned NUMERIC` (planned vs. `amount` actual). Subscriptions
benefit from `next_charge DATE` (derivable). All nullable, backward-compatible.

## Verdict

The four finance apps diverge enough that one template is a poor fit:

- **bills / invoices** → ride the upgraded template (payables with due dates + recurrence).
- **subscriptions** → graduate, or specialize: monthly/annual recurring totals, renewal calendar,
  "cancel before" flags. See its file.
- **budget** → graduate: planned-vs-actual per category, ideally reading real spend from the
  Expenses app. The current "list of payables" model is the wrong shape for a budget. See its file.

Consider unifying **expenses + budget + bills + subscriptions** under one money model later so they
share categories and totals.
