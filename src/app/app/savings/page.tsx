import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { Shell } from "@/components/modern/Shell";
import { SavingsView } from "./SavingsView";
import type { ContributionRow, GoalRow } from "./lib";

export const dynamic = "force-dynamic";

export default async function SavingsPage() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const [{ data: goalsData }, { data: contribsData }] = await Promise.all([
    supabase
      .from("goals")
      .select("id, title, target_value, due_date, status, created_at")
      .eq("user_id", user.id)
      .eq("goal_type", "savings")
      .order("created_at", { ascending: true }),
    supabase
      .from("savings_contributions")
      .select("id, goal_id, amount, contributed_on, note, created_at")
      .eq("user_id", user.id)
      .order("contributed_on", { ascending: false })
      .limit(2000),
  ]);

  const goals: GoalRow[] = (goalsData || []).map((g) => ({
    id: g.id as number,
    title: g.title as string,
    target_value: g.target_value === null ? null : Number(g.target_value),
    due_date: (g.due_date as string | null) ?? null,
    status: (g.status as string) ?? "active",
    created_at: g.created_at as string,
  }));

  const contributions: ContributionRow[] = (contribsData || []).map((c) => ({
    id: c.id as number,
    goal_id: c.goal_id as number,
    amount: Number(c.amount) || 0,
    contributed_on: c.contributed_on as string,
    note: (c.note as string) ?? "",
    created_at: c.created_at as string,
  }));

  return (
    <Shell back={{ href: "/", label: "Apps" }} title="Savings">
      <SavingsView goals={goals} contributions={contributions} />
    </Shell>
  );
}
