# Subscriptions (`subscriptions`)

**Purpose** — See every recurring subscription, what it costs per month and per year, and when each one renews.

**Current state** — Generic `FinanceView` (`itemType: "subscription"`, `hasAmount`, no due date). Add name/amount/category; mark "paid"; "Outstanding" total; collapsed Paid section; delete. Hardcodes `$`.

**Gaps** — The entire payables framing is wrong for subscriptions. A subscription isn't "paid" or "unpaid" — it's *active* and recurring, so the paid checkbox and "Outstanding" total are meaningless here. What a subscriptions app must answer is: **how much am I spending per month and per year**, and **what's about to renew** — neither of which the template shows. There's no billing cycle (Netflix monthly vs. a domain billed yearly are added as the same flat amount, making the total nonsense). No next-charge date, so you can't see the renewal calendar or catch a free trial before it bills. No "cancel before" flag for trials. No category breakdown of where subscription money actually goes, and no cost-creep trend as prices rise.

**Plan** — **Graduate / specialize.** This needs its own view (`ui: "modern"`, `page.tsx` + `actions.ts`) keeping the `finance_items` table. The recurring-totals + next-charge logic from `_finance-template.md` is the foundation; the rest is subscription-specific.

**P1 — makes it complete**
- **Monthly & annual recurring totals as the hero** — two big numbers: normalized **monthly** spend and **annual** spend, computed by converting each item to a common cadence (yearly ÷ 12 into monthly; monthly × 12 into annual). These replace "Outstanding" entirely.
- **Billing cycle per item** — `recurrence` of monthly / yearly (later weekly) chosen on add, shown on each row ("$12/mo", "$96/yr"). Drives the totals above.
- **Next-charge date + renewal list** — store/derive `next_charge`; sort the list by it; surface "renews in 4 days" with amber/red urgency like bills. The list *is* a renewal calendar.

**P2 — enhancements**
- **Category breakdown** (see template) — horizontal bar of monthly spend by category (streaming / software / news) so you see where subscription money concentrates.
- **"Cancel before" flag for trials** — a `cancel_by DATE`; flag trials approaching that date in red ("cancel by Fri") so a free trial never silently converts.
- **Cost-creep trend** — track price changes per subscription over time; show total monthly cost across the last ~6 months so creeping price hikes are visible.

**P3 — delight**
- **Pause / archive** a subscription (kept for history) rather than delete, so the trend stays intact.
- **Per-item annualized "is it worth it?"** — show yearly cost prominently next to each so a "$15/mo" item reads as "$180/yr".
- **Reminders** before a renewal or trial-end (cross-cutting — notifications).

**Data** — Keeps `finance_items` (graduating the view, not the table). Add `recurrence TEXT` + `next_charge DATE` (shared template) as the core fields; `cancel_by DATE` for trial flags; optional `active BOOLEAN DEFAULT true` for pause/archive. The `paid`/`due_date` columns go unused for this app. Price-history trend (P2) wants a small `subscription_prices (id, item_id, amount, effective_date)` child table later, or just snapshot on edit.

**Verdict** — **GRADUATE / specialize.** The payables model actively misleads here; monthly/annual totals + renewal calendar are the whole product. Effort **M**.
