# Warranties (`warranty`)

**Purpose** — Track product warranties and get warned before they expire.

**Current state** — Generic ChecklistView, `listType: "warranty"`, itemLabel "Warranty". A flat list of item names you check off. Completely wrong model: a warranty isn't a task to complete — it's a date window that you want to be reminded about before it closes.

**Gaps**
- No purchase date, warranty length, or computed expiry.
- No "expiring soon" awareness — the whole point of the app.
- No store/receipt info, no sort by expiry.
- "Checking off" a warranty is meaningless.

**Plan**
- **P1 (graduate)** — Custom page. Add an item with purchase date + warranty length (months/years) → compute **EXPIRY date**. Cards sorted by soonest expiry. Status badge: red "Expired", amber "Expiring soon" (< 30/60 days), green "Active (N months left)". Hero: count expiring in the next 60 days.
- **P2** — Store/vendor + receipt note (and optional photo of the receipt via Supabase Storage). Stats strip: total tracked, active, expiring soon, expired. Adaptive remaining-time formatting ("2 years left", "in 3 weeks").
- **P3** — Archive expired items (hide from main list, keep for records); group by category (electronics/appliances/etc.); optional purchase-price field for an "asset value under warranty" total.

**Data** — New table `warranties` (graduate off `checklists`): `id, user_id, name, purchase_date DATE, warranty_months INT, store TEXT, note TEXT, receipt_url TEXT, archived BOOL, created_at`. Expiry computed (`purchase_date + warranty_months`), not stored. Standard RLS pair.

**Verdict** — **GRADUATE** — purely date-driven, not a checklist at all. Effort **M**.
