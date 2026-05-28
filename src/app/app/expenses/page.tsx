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

export const EXPENSE_CATEGORIES = [
  "Food",
  "Transport",
  "Housing",
  "Utilities",
  "Entertainment",
  "Health",
  "Shopping",
  "Other",
] as const;

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
  for (const e of expenses) {
    const amount = Number(e.amount) || 0;
    if (e.expense_date >= monthStart) monthTotal += amount;
    if (e.expense_date >= weekStart) weekTotal += amount;
  }

  return (
    <Shell back={{ href: "/", label: "Apps" }} title="Expenses">
      <ExpensesView
        expenses={expenses}
        monthTotal={monthTotal}
        weekTotal={weekTotal}
        categories={[...EXPENSE_CATEGORIES]}
      />
    </Shell>
  );
}
