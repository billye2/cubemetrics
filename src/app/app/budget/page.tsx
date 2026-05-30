import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { Shell } from "@/components/modern/Shell";
import { BudgetView } from "./BudgetView";

export const dynamic = "force-dynamic";

export interface CategoryRow {
  id: number;
  name: string;
  color: string;
  sort_order: number;
}

export interface BudgetLine {
  category: string;
  color: string;
  /** Planned monthly budget for this category (0 when unset). */
  planned: number;
  /** Actual spend this month, summed from the expenses table. */
  spent: number;
}

// Mirror of the Expenses app's legacy defaults so a first-time Budget user
// (who hasn't opened Expenses yet) gets the same shared category vocabulary.
const DEFAULT_CATEGORIES: { name: string; color: string }[] = [
  { name: "Food", color: "#f59e0b" },
  { name: "Transport", color: "#3b82f6" },
  { name: "Housing", color: "#8b5cf6" },
  { name: "Utilities", color: "#14b8a6" },
  { name: "Entertainment", color: "#ec4899" },
  { name: "Health", color: "#ef4444" },
  { name: "Shopping", color: "#06b6d4" },
  { name: "Other", color: "#71717a" },
];

function monthStartISO(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

function nextMonthStartISO(monthStart: string): string {
  const [y, m] = monthStart.split("-").map(Number);
  const d = new Date(y, m, 1); // m is 1-based, so this is the next month
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

export default async function BudgetPage() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const month = monthStartISO();
  const nextMonth = nextMonthStartISO(month);

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

  const [{ data: targetData }, { data: expenseData }] = await Promise.all([
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
  ]);

  const plannedByCat = new Map<string, number>();
  for (const t of targetData || []) {
    plannedByCat.set(t.category as string, Number(t.planned) || 0);
  }

  const spentByCat = new Map<string, number>();
  for (const e of expenseData || []) {
    const cat = e.category as string;
    spentByCat.set(cat, (spentByCat.get(cat) || 0) + (Number(e.amount) || 0));
  }

  // Build one line per known category, plus any orphan categories that only
  // appear in planned targets or in expenses (e.g. a deleted category that
  // still tags old rows). Order: known categories first (by sort_order),
  // then orphans.
  const colorOf = new Map(categories.map((c) => [c.name, c.color]));
  const seen = new Set<string>();
  const lines: BudgetLine[] = [];

  for (const c of categories) {
    seen.add(c.name);
    lines.push({
      category: c.name,
      color: c.color,
      planned: plannedByCat.get(c.name) || 0,
      spent: spentByCat.get(c.name) || 0,
    });
  }
  // Orphans (planned or spent but no matching category row).
  const orphans = new Set<string>();
  for (const k of plannedByCat.keys()) if (!seen.has(k)) orphans.add(k);
  for (const k of spentByCat.keys()) if (!seen.has(k)) orphans.add(k);
  for (const name of orphans) {
    lines.push({
      category: name,
      color: colorOf.get(name) || "#71717a",
      planned: plannedByCat.get(name) || 0,
      spent: spentByCat.get(name) || 0,
    });
  }

  return (
    <Shell back={{ href: "/", label: "Apps" }} title="Budget">
      <BudgetView month={month} categories={categories} lines={lines} />
    </Shell>
  );
}
