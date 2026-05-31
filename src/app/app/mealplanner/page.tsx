import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { Shell } from "@/components/modern/Shell";
import { MealPlannerView } from "./MealPlannerView";
import { toMeal, weekDates, ymdFromDate, type Meal, type MealRow } from "./lib";

export const dynamic = "force-dynamic";

export interface RecipeOption {
  id: number;
  name: string;
}

export default async function MealPlannerPage() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const today = ymdFromDate(new Date());
  const dates = weekDates(today);

  const [{ data: mealRows }, { data: recipeRows }] = await Promise.all([
    supabase
      .from("meal_plan")
      .select("id, user_id, date, slot, meal, recipe_id, created_at")
      .eq("user_id", user.id)
      .in("date", dates),
    supabase
      .from("recipes")
      .select("id, name")
      .eq("user_id", user.id)
      .order("name", { ascending: true })
      .limit(500),
  ]);

  const meals: Meal[] = [];
  for (const row of (mealRows || []) as MealRow[]) {
    const m = toMeal(row);
    if (m) meals.push(m);
  }

  const recipes: RecipeOption[] = (recipeRows || []).map((r) => ({
    id: r.id as number,
    name: r.name as string,
  }));

  return (
    <Shell back={{ href: "/apps", label: "Apps" }} title="Meals">
      <MealPlannerView today={today} initialMeals={meals} recipes={recipes} />
    </Shell>
  );
}
