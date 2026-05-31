# Recipes (`recipes`)

**Purpose** — A personal recipe collection: ingredients, steps, and timings you can actually cook from.

**Current state** — Generic `LogbookView` (`hasTitle: true`, `entryLabel: "Recipe"`). Title + one textarea. A recipe is structured data (ingredients, steps, servings, times) crammed into prose — no scaling, no cook mode, no filtering.

**Gaps**
- Ingredients and steps aren't separable, so you can't scale servings or check off steps while cooking.
- No servings / prep / cook time metadata; no cuisine/meal filtering.
- No cook-friendly view (big text, no sleep, no accidental navigation) and no photo.

**Plan** — **GRADUATE** to a custom app. ✅ **Graduated** — now a custom `modern` app at `src/app/app/recipes/`.
- **P1** — Structured recipe: **ingredients list** (qty + unit + item), ordered **steps**, **servings**, **prep time**, **cook time**, and **tags** (cuisine / meal). List + detail views; search by name/ingredient/tag.
  - [x] Three-table schema + RLS (`recipes`, `recipe_ingredients`, `recipe_steps`).
  - [x] List view with search across name / ingredient / tag.
  - [x] Detail view (ingredients, ordered steps, prep/cook/total time, tags, notes).
  - [x] Full editor: create/edit with repeatable ingredient + step rows, delete recipe.
- **P2** — **Servings scaler**: a stepper that rescales all ingredient quantities live. **Cook mode**: distraction-free full-screen view with large text, checkable steps, ingredients pinned, and a keep-awake (`wakeLock`) so the screen doesn't sleep mid-cook.
  - [x] Servings stepper rescales every ingredient qty live (vulgar-fraction formatting), in both detail and cook views.
  - [x] Cook mode: large text, checkable steps, ingredients pinned, `wakeLock` keep-awake (re-acquired on tab visibility).
- **P3** — **Photo** per recipe (Supabase Storage). **Link from Meal Planner**: let the meal planner reference a recipe so a planned meal opens its recipe. Optional per-step inline timers. ✅ **Shipped.**
  - [x] Photo per recipe (Supabase Storage, owner-only `recipe-photos` bucket). `recipes.photo_path` now holds the Storage object path; the page derives the public URL on read. Thumbnail in the list, hero image in detail, add/replace/remove in the editor (existing recipes; create first then add). Deleting a recipe (or removing the photo) best-effort drops the Storage object.
  - [x] Link from Meal Planner so a planned meal opens its recipe — recipes honors a `?id=<n>` deep link that opens that recipe's detail directly. The meal planner already carries `meals.recipe_id`, so it can route to `/app/recipes?id=<recipe_id>` (no recipes-side schema change needed).
  - [x] Per-step inline cook timers — `parseStepDuration` sniffs a duration out of each step's text (e.g. "simmer 20 min", "1-2 minutes" → upper bound) and cook mode shows a wall-clock-anchored countdown (start/pause/resume/reset + a beep at zero) under any timed step.

**Data** — New tables:
- `recipes` (`id, user_id, name, servings, prep_min, cook_min, tags TEXT[], photo_path, created_at`)
- `recipe_ingredients` (`id, recipe_id, qty NUMERIC, unit, item, sort`)
- `recipe_steps` (`id, recipe_id, step_no, text`)

Standard RLS pair on each, scoped through `recipe_id → recipes.user_id`. Photo in a per-user Storage bucket with owner-only policies.

**Verdict** — **GRADUATE.** Recipes are structured; scaling + cook mode demand real schema. Effort **M/L**.

---

## Schema delta (shipped) — fold into `docs/database.md` at fan-in

Migration `src/supabase/migrations/20260530T0631_recipes.sql` adds three tables. (`recipes` gained two columns beyond the original plan sketch: `notes TEXT` for make-ahead/substitution notes, and `tags` defaults to `'{}'` not null.)

```
recipes(id, user_id→auth.users, name, servings NUMERIC, prep_min INT, cook_min INT,
        tags TEXT[] default '{}', photo_path TEXT, notes TEXT, created_at)
recipe_ingredients(id, recipe_id→recipes ON DELETE CASCADE, qty NUMERIC, unit TEXT, item TEXT, sort INT)
recipe_steps(id, recipe_id→recipes ON DELETE CASCADE, step_no INT, text TEXT)
```

RLS: `recipes` is owner-scoped (`auth.uid() = user_id`) + the conventional SysOp read.
Child tables (`recipe_ingredients`, `recipe_steps`) are scoped **through** the parent —
`EXISTS (SELECT 1 FROM recipes r WHERE r.id = recipe_id AND r.user_id = auth.uid())` for both
USING and WITH CHECK — so a user can only touch children of recipes they own. Indexes:
`recipes(user_id, created_at DESC)`, `recipe_ingredients(recipe_id, sort)`, `recipe_steps(recipe_id, step_no)`.

Children are written wholesale on save (delete-all + re-insert under the recipe_id) — simplest
correct model for an edit-the-whole-recipe form. The migration is **not yet applied to remote
Supabase** (this lane runs in an isolated worktree; integrator applies on merge).

### P3 delta — `src/supabase/migrations/20260530T0900_recipes_p3.sql`

Adds the **`recipe-photos`** Storage bucket (public, so the detail/list `<img>` is a plain GET).
Owner-only `INSERT`/`UPDATE`/`DELETE` policies on `storage.objects` scoped to the uploader's
user-id folder — objects live at `<user_id>/<recipe_id>-<ts>.<ext>`. **No table changes**: the
`recipes.photo_path` column (reserved at P1) now stores that object path, and the page derives the
public URL at read time via `storage.from('recipe-photos').getPublicUrl(path)`. The per-step timers
and the meal-planner `?id=` deep link are client-only / routing concerns and add no schema. Mirrors
the plantcare P3 photo pattern. **Not yet applied to remote Supabase** — integrator applies on merge.
