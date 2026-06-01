import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { Shell } from "@/components/modern/Shell";
import { TrackUsage } from "@/components/modern/TrackUsage";
import { BudgetView } from "./BudgetView";
import {
  buildLines,
  isMonthISO,
  monthStartISO,
  nextMonthStartISO,
  prevMonthStartISO,
  sumByCategory,
  type BudgetLine,
  type CategoryRow,
} from "./lib";

export const dynamic = "force-dynamic";

// Re-export the shared types so existing imports (./page) keep working.
export type { BudgetLine, CategoryRow };

// Mirror of the Expenses app's legacy defaults so a first-time Budget user
// (who hasn't opened Expenses yet) gets the same shared category vocabulary.
const DEFAULT_CATEGORIES: { name: string; color: string }[] = [
  { name: "Food", color: "#f59e0b" },
  { name: "Transport", color: "#3b82f6" },
  { name: "Housing", color: "#8b5cf6" },
  { name: "Utilities", color: "#14b8a6" },
  { name: "Entertainment", color: "#ec4899" },
  { name: "Health", color: "#ef4444" },
  { name: "Shopping", color: "#74a9f0" },
  { name: "Other", color: "#948e85" },
];

export default async function BudgetPage({
  searchParams,
}: {
  searchParams: Promise<{ m?: string }>;
}) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const currentMonth = monthStartISO();
  const sp = await searchParams;
  // Month navigation (P2): ?m=YYYY-MM-01 picks a month; default is current.
  const month = sp?.m && isMonthISO(sp.m) ? sp.m : currentMonth;
  const isCurrentMonth = month === currentMonth;
  const nextMonth = nextMonthStartISO(month);
  const prevMonth = prevMonthStartISO(month);

  // Shared category vocabulary (same table the Expenses app owns). Seed the
  // legacy defaults the first time a user has none so the join works.
  let { data: catData } = await supabase
    .from("expense_categories")
    .select("id, name, color, sort_order")
    .eq("user_id", user.id)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (!catData || catData.length === 0) {
    await supabase.from("expense_categories").insert(
      DEFAULT_CATEGORIES.map((c, i) => ({
        user_id: user.id,
        name: c.name,
        color: c.color,
        sort_order: i,
      })),
    );
    const reread = await supabase
      .from("expense_categories")
      .select("id, name, color, sort_order")
      .eq("user_id", user.id)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });
    catData = reread.data;
  }
  const categories = (catData || []) as CategoryRow[];

  const [{ data: targetData }, { data: expenseData }, { data: prevTargetData }] =
    await Promise.all([
      supabase
        .from("budget_targets")
        .select("category, planned")
        .eq("user_id", user.id)
        .eq("month", month),
      supabase
        .from("expenses")
        .select("amount, category, expense_date")
        .eq("user_id", user.id)
        .gte("expense_date", month)
        .lt("expense_date", nextMonth),
      // Previous month's targets power the "copy forward" prompt when the
      // selected month has no budget set yet.
      supabase
        .from("budget_targets")
        .select("category, planned")
        .eq("user_id", user.id)
        .eq("month", prevMonth),
    ]);

  const plannedByCat = new Map<string, number>();
  for (const t of targetData || []) {
    plannedByCat.set(t.category as string, Number(t.planned) || 0);
  }

  const spentByCat = sumByCategory(
    (expenseData || []).map((e) => ({
      category: e.category as string,
      amount: e.amount as number,
    })),
  );

  const lines = buildLines(categories, plannedByCat, spentByCat);

  const prevPlannedCount = (prevTargetData || []).length;
  const hasPlan = (targetData || []).length > 0;

  return (
    <Shell back={{ href: "/apps", label: "Apps" }} title="Budget">
      <TrackUsage appId="budget" />
      <BudgetView
        month={month}
        prevMonth={prevMonth}
        nextMonth={nextMonth}
        isCurrentMonth={isCurrentMonth}
        categories={categories}
        lines={lines}
        canCopyForward={!hasPlan && prevPlannedCount > 0}
        prevPlannedCount={prevPlannedCount}
      />
    </Shell>
  );
}
