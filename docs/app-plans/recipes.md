# Recipes (`recipes`)

**Purpose** — A personal recipe collection: ingredients, steps, and timings you can actually cook from.

**Current state** — Generic `LogbookView` (`hasTitle: true`, `entryLabel: "Recipe"`). Title + one textarea. A recipe is structured data (ingredients, steps, servings, times) crammed into prose — no scaling, no cook mode, no filtering.

**Gaps**
- Ingredients and steps aren't separable, so you can't scale servings or check off steps while cooking.
- No servings / prep / cook time metadata; no cuisine/meal filtering.
- No cook-friendly view (big text, no sleep, no accidental navigation) and no photo.

**Plan** — **GRADUATE** to a custom app.
- **P1** — Structured recipe: **ingredients list** (qty + unit + item), ordered **steps**, **servings**, **prep time**, **cook time**, and **tags** (cuisine / meal). List + detail views; search by name/ingredient/tag.
- **P2** — **Servings scaler**: a stepper that rescales all ingredient quantities live. **Cook mode**: distraction-free full-screen view with large text, checkable steps, ingredients pinned, and a keep-awake (`wakeLock`) so the screen doesn't sleep mid-cook.
- **P3** — **Photo** per recipe (Supabase Storage). **Link from Meal Planner**: let the meal planner reference a recipe so a planned meal opens its recipe. Optional per-step inline timers.

**Data** — New tables:
- `recipes` (`id, user_id, name, servings, prep_min, cook_min, tags TEXT[], photo_path, created_at`)
- `recipe_ingredients` (`id, recipe_id, qty NUMERIC, unit, item, sort`)
- `recipe_steps` (`id, recipe_id, step_no, text`)

Standard RLS pair on each, scoped through `recipe_id → recipes.user_id`. Photo in a per-user Storage bucket with owner-only policies.

**Verdict** — **GRADUATE.** Recipes are structured; scaling + cook mode demand real schema. Effort **M/L**.
