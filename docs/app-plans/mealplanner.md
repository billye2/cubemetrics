# Meals (`mealplanner`)

**Purpose** — Plan the week's meals and turn them into a grocery list.

**Current state** — Generic ChecklistView, `listType: "meal"`, itemLabel "Meal". A flat list of meal names. Meal planning is a **week grid** (meal slot × day), not a linear checklist.

**Gaps**
- No week structure — can't see Mon–Sun at a glance.
- No breakfast/lunch/dinner slots per day.
- No link to recipes; no grocery-list generation (the payoff).

**Plan**
- **P1 (graduate)** — Custom page rendering a **week grid**: rows = Breakfast / Lunch / Dinner, columns = the 7 days (phone-first: a vertical day-by-day list of three slots, with a compact grid on wider screens). Tap a slot to assign a meal name. Hero/default: **this-week** view with today highlighted.
- **P2** — Assign meals from the **Recipes logbook** (link/pick an existing recipe) instead of free text. **Auto-generate a grocery list**: a one-tap action that writes the week's ingredients into the `grocery` checklist (`list_type='grocery'`), de-duplicated.
- **P3** — Week navigation (prev/next week), "copy last week" to reuse a plan, and a meals-eaten history; optional servings/notes per slot.

**Data** — New table `meal_plan` (graduate off `checklists`): `id, user_id, date DATE, slot ('breakfast'|'lunch'|'dinner'), meal TEXT, recipe_id (FK to recipes/logs, nullable), created_at`. Grocery generation writes into existing `checklists` rows (`list_type='grocery'`). Standard RLS pair.

**Verdict** — **GRADUATE** to a week-grid planner that links to Recipes and feeds the grocery list. Effort **M**.
