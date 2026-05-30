# Meals (`mealplanner`)

**Purpose** — Plan the week's meals and turn them into a grocery list.

**Current state** — Generic ChecklistView, `listType: "meal"`, itemLabel "Meal". A flat list of meal names. Meal planning is a **week grid** (meal slot × day), not a linear checklist.

**Gaps**
- No week structure — can't see Mon–Sun at a glance.
- No breakfast/lunch/dinner slots per day.
- No link to recipes; no grocery-list generation (the payoff).

**Plan**
- [x] **P1 (graduate)** — Custom page rendering a **week grid**: rows = Breakfast / Lunch / Dinner, columns = the 7 days (phone-first: a vertical day-by-day list of three slots, with a compact two-column grid on wider screens). Tap a slot to assign a meal name. Hero/default: **this-week** view with today highlighted.
- [x] **P2** — Assign meals from the **Recipes** app (link/pick an existing recipe) instead of free text. **Auto-generate a grocery list**: a one-tap action that aggregates the week's linked-recipe ingredients into the `grocery` checklist (`list_type='grocery'`), de-duplicated (same item+unit summed; mismatched units kept separate; idempotent against existing grocery rows).
- [x] **P3** — Week navigation (prev/next week + "jump to this week") and "copy last week" to reuse a plan. *(Meals-eaten history and per-slot servings/notes left for a future pass.)*

**Data (shipped)** — New table `public.meal_plan` (graduated off `checklists`); migration `src/supabase/migrations/20260530T0730_meal_plan.sql`:

```sql
CREATE TABLE public.meal_plan (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  slot TEXT NOT NULL CHECK (slot IN ('breakfast','lunch','dinner')),
  meal TEXT NOT NULL,
  recipe_id BIGINT REFERENCES public.recipes(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, date, slot)
);
```

- RLS: owner-scoped `FOR ALL USING/WITH CHECK (auth.uid() = user_id)` + the standard SysOp read policy.
- One row per `(user_id, date, slot)` (unique constraint → slot assignments upsert).
- `recipe_id` is a nullable FK to `public.recipes` with `ON DELETE SET NULL` — deleting a recipe leaves the planned meal name intact.
- Grocery generation **reads** linked recipes' `recipe_ingredients` and **writes** new `checklists` rows (`list_type='grocery'`); no schema change to `checklists`.

**Integrator note** — fold the `meal_plan` table into `docs/database.md`; the table delta above is the source of truth.

**Verdict** — **GRADUATED** to a week-grid planner that links to Recipes and feeds the grocery list. Effort **M**. P1–P3 shipped.
