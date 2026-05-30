import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { Shell } from "@/components/modern/Shell";
import { RecipesView } from "./RecipesView";
import {
  toRecipe,
  type Recipe,
  type RecipeRow,
  type IngredientRow,
  type StepRow,
} from "./lib";

export const dynamic = "force-dynamic";

export default async function RecipesPage() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: recipeRows } = await supabase
    .from("recipes")
    .select("id, user_id, name, servings, prep_min, cook_min, tags, photo_path, notes, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(500);

  const recipes: Recipe[] = [];
  const ids = (recipeRows || []).map((r) => r.id as number);

  if (ids.length > 0) {
    const [{ data: ingRows }, { data: stepRows }] = await Promise.all([
      supabase
        .from("recipe_ingredients")
        .select("id, recipe_id, qty, unit, item, sort")
        .in("recipe_id", ids),
      supabase
        .from("recipe_steps")
        .select("id, recipe_id, step_no, text")
        .in("recipe_id", ids),
    ]);

    const ingByRecipe = new Map<number, IngredientRow[]>();
    for (const r of (ingRows || []) as IngredientRow[]) {
      (ingByRecipe.get(r.recipe_id) ?? ingByRecipe.set(r.recipe_id, []).get(r.recipe_id)!).push(r);
    }
    const stepsByRecipe = new Map<number, StepRow[]>();
    for (const r of (stepRows || []) as StepRow[]) {
      (stepsByRecipe.get(r.recipe_id) ?? stepsByRecipe.set(r.recipe_id, []).get(r.recipe_id)!).push(r);
    }

    for (const row of (recipeRows || []) as RecipeRow[]) {
      recipes.push(
        toRecipe(row, ingByRecipe.get(row.id) ?? [], stepsByRecipe.get(row.id) ?? []),
      );
    }
  }

  return (
    <Shell back={{ href: "/", label: "Apps" }} title="Recipes">
      <RecipesView recipes={recipes} />
    </Shell>
  );
}
