"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabase } from "@/lib/supabase/server";
import {
  normalizeSlot,
  aggregateGroceries,
  toMeal,
  type Meal,
  type MealRow,
  type RecipeBundle,
  type Slot,
} from "./lib";

async function requireUser() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return { supabase, userId: user.id };
}

const PATH = "/app/mealplanner";
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function cleanDate(s: string): string | null {
  return DATE_RE.test(s) ? s : null;
}

/**
 * Assign a meal to a (date, slot). One row per slot — upserts on the
 * (user_id, date, slot) unique constraint. `recipeId` links to a Recipes row;
 * pass null for a free-text meal. Empty meal text clears the slot instead.
 */
export async function setMeal(
  date: string,
  slot: Slot,
  meal: string,
  recipeId: number | null,
): Promise<void> {
  const d = cleanDate(date);
  const s = normalizeSlot(slot);
  if (!d || !s) return;
  const name = meal.trim().slice(0, 200);

  const { supabase, userId } = await requireUser();

  if (!name) {
    await supabase
      .from("meal_plan")
      .delete()
      .eq("user_id", userId)
      .eq("date", d)
      .eq("slot", s);
    revalidatePath(PATH);
    return;
  }

  await supabase.from("meal_plan").upsert(
    {
      user_id: userId,
      date: d,
      slot: s,
      meal: name,
      recipe_id: recipeId ?? null,
    },
    { onConflict: "user_id,date,slot" },
  );
  revalidatePath(PATH);
}

/** Clear a single slot. */
export async function clearMeal(date: string, slot: Slot): Promise<void> {
  const d = cleanDate(date);
  const s = normalizeSlot(slot);
  if (!d || !s) return;
  const { supabase, userId } = await requireUser();
  await supabase
    .from("meal_plan")
    .delete()
    .eq("user_id", userId)
    .eq("date", d)
    .eq("slot", s);
  revalidatePath(PATH);
}

/** P3 — fetch the meals for an arbitrary set of dates (prev/next week nav). */
export async function getWeekMeals(dates: string[]): Promise<Meal[]> {
  const clean = dates.map(cleanDate).filter((d): d is string => d !== null);
  if (clean.length === 0) return [];
  const { supabase, userId } = await requireUser();
  const { data } = await supabase
    .from("meal_plan")
    .select("id, user_id, date, slot, meal, recipe_id, created_at")
    .eq("user_id", userId)
    .in("date", clean);
  const out: Meal[] = [];
  for (const row of (data || []) as MealRow[]) {
    const m = toMeal(row);
    if (m) out.push(m);
  }
  return out;
}

/**
 * P3 — copy one week's plan onto another. Reads the source week's meals and
 * upserts them onto the matching weekday of the target week. Returns the new
 * meals for the target week so the client can refresh without a reload.
 */
export async function copyWeek(fromMonday: string, toMonday: string): Promise<Meal[]> {
  const from = cleanDate(fromMonday);
  const to = cleanDate(toMonday);
  if (!from || !to) return [];
  const { supabase, userId } = await requireUser();

  const fromDates = Array.from({ length: 7 }, (_, i) => offsetDate(from, i));
  const { data: srcRows } = await supabase
    .from("meal_plan")
    .select("date, slot, meal, recipe_id")
    .eq("user_id", userId)
    .in("date", fromDates);

  const rows = (srcRows || []).map((r) => {
    const dayIdx = fromDates.indexOf(r.date as string);
    return {
      user_id: userId,
      date: offsetDate(to, dayIdx < 0 ? 0 : dayIdx),
      slot: r.slot as string,
      meal: r.meal as string,
      recipe_id: (r.recipe_id as number | null) ?? null,
    };
  });

  if (rows.length > 0) {
    await supabase.from("meal_plan").upsert(rows, { onConflict: "user_id,date,slot" });
  }
  revalidatePath(PATH);
  return getWeekMeals(Array.from({ length: 7 }, (_, i) => offsetDate(to, i)));
}

function offsetDate(s: string, n: number): string {
  const d = new Date(s + "T00:00:00");
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

export interface GenerateResult {
  added: number;
  recipes: number;
}

/**
 * P2 — Auto-generate a grocery list from the week's planned meals.
 * Pulls every linked recipe across the 7 given dates, aggregates and
 * de-duplicates the ingredients, then writes them as `checklists` rows with
 * list_type='grocery' (the existing Grocery app reads these). Skips titles
 * already present in the grocery list so re-running is idempotent.
 */
export async function generateGroceries(dates: string[]): Promise<GenerateResult> {
  const clean = dates.map(cleanDate).filter((d): d is string => d !== null);
  if (clean.length === 0) return { added: 0, recipes: 0 };

  const { supabase, userId } = await requireUser();

  // Which recipes are planned this week?
  const { data: planRows } = await supabase
    .from("meal_plan")
    .select("recipe_id")
    .eq("user_id", userId)
    .in("date", clean)
    .not("recipe_id", "is", null);

  const recipeIds = (planRows || [])
    .map((r) => r.recipe_id as number | null)
    .filter((id): id is number => id !== null);

  if (recipeIds.length === 0) return { added: 0, recipes: 0 };

  // Load the ingredient rows for those recipes (RLS keeps it owner-scoped).
  const uniqueRecipeIds = Array.from(new Set(recipeIds));
  const { data: ingRows } = await supabase
    .from("recipe_ingredients")
    .select("recipe_id, qty, unit, item")
    .in("recipe_id", uniqueRecipeIds);

  const byRecipe = new Map<number, RecipeBundle>();
  for (const id of uniqueRecipeIds) byRecipe.set(id, { id, name: "", ingredients: [] });
  for (const row of ingRows || []) {
    const bundle = byRecipe.get(row.recipe_id as number);
    if (bundle) {
      bundle.ingredients.push({
        qty: row.qty === null ? null : Number(row.qty),
        unit: (row.unit as string) ?? "",
        item: row.item as string,
      });
    }
  }

  // A recipe planned twice contributes twice (more servings to shop for).
  const bundles: RecipeBundle[] = recipeIds.map(
    (id) => byRecipe.get(id) ?? { id, name: "", ingredients: [] },
  );
  const lines = aggregateGroceries(bundles);
  if (lines.length === 0) return { added: 0, recipes: uniqueRecipeIds.length };

  // De-dupe against existing grocery items (case-insensitive title match).
  const { data: existing } = await supabase
    .from("checklists")
    .select("title")
    .eq("user_id", userId)
    .eq("list_type", "grocery");
  const have = new Set(
    (existing || []).map((r) => (r.title as string).trim().toLowerCase()),
  );

  const toInsert = lines.filter((l) => !have.has(l.title.trim().toLowerCase()));
  if (toInsert.length === 0) return { added: 0, recipes: uniqueRecipeIds.length };

  await supabase.from("checklists").insert(
    toInsert.map((l, idx) => ({
      user_id: userId,
      list_type: "grocery",
      title: l.title,
      completed: false,
      sort_order: idx,
    })),
  );

  revalidatePath(PATH);
  revalidatePath("/app/grocery");
  return { added: toInsert.length, recipes: uniqueRecipeIds.length };
}
