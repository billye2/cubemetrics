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
  - [x] Custom page graduated off `ChecklistView` (`ui: "modern"`, `src/app/app/warranty/`).
  - [x] Add form: name + purchase date + coverage length → computed expiry (`computeExpiry`, day-of-month overflow clamped).
  - [x] Cards sorted by soonest expiry (soon → active → expired, then by days left).
  - [x] Status badge: rose "Expired", amber "Expiring soon" (≤ 60 days), emerald "Active".
  - [x] Hero: count expiring in the next 60 days.
- **P2** — Store/vendor + receipt note (and optional photo of the receipt via Supabase Storage). Stats strip: total tracked, active, expiring soon, expired. Adaptive remaining-time formatting ("2 years left", "in 3 weeks").
  - [x] Store/vendor + receipt note fields on add + detail.
  - [x] Stats strip: tracked / active / soon / expired.
  - [x] Adaptive remaining-time formatting (`formatRemaining`: "2 years left", "in 3 weeks", "expired 5 days ago").
  - [ ] Receipt **photo** upload via Supabase Storage — deferred (needs a storage bucket + policy; `receipt_url` column is in place to wire it later).
- **P3** — Archive expired items (hide from main list, keep for records); group by category (electronics/appliances/etc.); optional purchase-price field for an "asset value under warranty" total.
  - [x] Archive / unarchive (hidden from main list, kept under a collapsible "Archived" section).
  - [ ] Group by category — deferred (no category column yet).
  - [ ] Purchase-price field + "asset value under warranty" total — deferred.

**Data** — New table `warranties` (graduate off `checklists`): `id, user_id, name, purchase_date DATE, warranty_months INT, store TEXT, note TEXT, receipt_url TEXT, archived BOOL, created_at`. Expiry computed (`purchase_date + warranty_months`), not stored. Standard RLS pair.

**Schema delta (shipped)** — migration `src/supabase/migrations/20260530T0527_warranties.sql` creates `public.warranties` exactly as specified above (`warranty_months` defaults 12, `archived` defaults false), enables RLS with the owner policy (`auth.uid() = user_id`, FOR ALL) + the conventional SysOp read policy, and adds index `warranties_user_idx (user_id, archived, purchase_date)`. **Not yet applied to remote Supabase** — the integrator applies it on fan-in (builder lane runs in an isolated worktree).

**Verdict** — **GRADUATE** — purely date-driven, not a checklist at all. Effort **M**. **Shipped: P1 fully, P2 (minus receipt photo), P3 archive.**
