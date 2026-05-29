# Wishlist (`wishlist`)

**Purpose** — Things you want to buy someday — gift ideas, treats, big-ticket saves — with price and link.

**Current state** — Generic `ChecklistView` (`ui: "checklist"`, `itemLabel` "Item"). Flat list of titles you check off and delete. No price, no link to the product, no priority — so it can't answer "how much would all this cost" or "what do I want most".

**Gaps** — A wishlist is a list of *products*, not tasks. A bare title loses the very things that make a wishlist useful: how much it costs, where to buy it, and how badly you want it. "Checking off" a wish should mean "I bought it" — it deserves to move to a purchased section, not vanish. There's no total cost to motivate saving and no way to sort by want-level or price.

**Plan**

**P1 — structure the wish**
- Cross-cutting row/progress upgrades: see `_checklist-template.md`.
- **Price + URL on each row.** Numeric price and a product link (tap title → opens in new tab). The two fields that turn a title into a wishlist item.
- **Priority.** A 3-level want-level (must / want / maybe) shown as a colored pill, sortable.

**P2 — value & lifecycle**
- **Total wishlist cost** in a hero/stat strip (sum of unpurchased prices), plus "purchased this year" total.
- **"Bought" moves to a Purchased section** instead of deleting — keep the price and date so the purchased total is real and you have a buy history.
- **Sort by price / priority / newest.**

**P3 — delight**
- **Optional image/preview.** A pasted image URL or favicon/OpenGraph thumbnail from the product link for a visual grid.
- **Price-drop note field** and a "saving toward" progress hint for big items.

**Data** — Light graduate vs rich template. Add to `checklists`: `note` (URL), `quantity`/a `price NUMERIC`, `due_date` reused as purchase date, plus a `priority` notion. If image + purchase history grow, a dedicated `wishlist_items` table (title, url, price, priority, image_url, purchased_at) is cleaner.

**Verdict** — **Ride the rich template, lean toward light GRADUATE. Effort S/M.** Most of the value (price, URL, priority, total, purchased section) fits on the upgraded `checklists` row; only the image/preview and purchase-history polish argue for a small custom table later.
