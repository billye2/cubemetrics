import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { Shell } from "@/components/modern/Shell";
import { ExpensesView } from "./ExpensesView";

export const dynamic = "force-dynamic";

export interface ExpenseRow {
  id: number;
  amount: number;
  currency: string;
  category: string;
  description: string;
  expense_date: string;
  created_at: string;
}

export interface CategoryRow {
  id: number;
  name: string;
  color: string;
  sort_order: number;
}

// Legacy fixed list — seeded for a user the first time they open the app with
// no custom categories, so existing rows keep matching by name.
export const DEFAULT_CATEGORIES: { name: string; color: string }[] = [
  { name: "Food", color: "#f59e0b" },
  { name: "Transport", color: "#3b82f6" },
  { name: "Housing", color: "#8b5cf6" },
  { name: "Utilities", color: "#14b8a6" },
  { name: "Entertainment", color: "#ec4899" },
  { name: "Health", color: "#ef4444" },
  { name: "Shopping", color: "#06b6d4" },
  { name: "Other", color: "#71717a" },
];

function startOfMonthISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

function startOfWeekISO(): string {
  const d = new Date();
  // Week starts Monday
  const day = d.getDay(); // 0 = Sun
  const diff = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - diff);
  return d.toISOString().split("T")[0];
}

export default async function ExpensesPage() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const monthStart = startOfMonthISO();
  const weekStart = startOfWeekISO();

  // Categories — seed the legacy defaults the first time a user has none.
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

  const { data } = await supabase
    .from("expenses")
    .select("id, amount, currency, category, description, expense_date, created_at")
    .eq("user_id", user.id)
    .order("expense_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(200);

  const expenses = (data || []) as ExpenseRow[];

  let monthTotal = 0;
  let weekTotal = 0;
  const monthByCategory = new Map<string, number>();
  for (const e of expenses) {
    const amount = Number(e.amount) || 0;
    if (e.expense_date >= monthStart) {
      monthTotal += amount;
      monthByCategory.set(e.category, (monthByCategory.get(e.category) || 0) + amount);
    }
    if (e.expense_date >= weekStart) weekTotal += amount;
  }

  // Rank categories by month spend, attach color (fall back to zinc for
  // categories that were deleted but still tag old rows).
  const colorOf = new Map(categories.map((c) => [c.name, c.color]));
  const breakdown = Array.from(monthByCategory.entries())
    .map(([name, total]) => ({
      name,
      total,
      color: colorOf.get(name) || "#71717a",
      pct: monthTotal > 0 ? (total / monthTotal) * 100 : 0,
    }))
    .sort((a, b) => b.total - a.total);

  return (
    <Shell back={{ href: "/", label: "Apps" }} title="Expenses">
      <ExpensesView
        expenses={expenses}
        monthTotal={monthTotal}
        weekTotal={weekTotal}
        categories={categories}
        breakdown={breakdown}
      />
    </Shell>
  );
}
