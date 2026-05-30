import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { Shell } from "@/components/modern/Shell";
import { DebtView } from "./DebtView";
import type { DebtRow, PaymentRow } from "./lib";

export const dynamic = "force-dynamic";

export default async function DebtPayoffPage() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const [{ data: debtsData }, { data: paymentsData }] = await Promise.all([
    supabase
      .from("debts")
      .select(
        "id, name, original_balance, current_balance, apr, min_payment, status, created_at"
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: true }),
    supabase
      .from("debt_payments")
      .select("id, debt_id, amount, paid_on, note, created_at")
      .eq("user_id", user.id)
      .order("paid_on", { ascending: false })
      .limit(2000),
  ]);

  const debts: DebtRow[] = (debtsData || []).map((d) => ({
    id: d.id as number,
    name: d.name as string,
    original_balance: Number(d.original_balance) || 0,
    current_balance: Number(d.current_balance) || 0,
    apr: Number(d.apr) || 0,
    min_payment: Number(d.min_payment) || 0,
    status: (d.status as string) ?? "active",
    created_at: d.created_at as string,
  }));

  const payments: PaymentRow[] = (paymentsData || []).map((p) => ({
    id: p.id as number,
    debt_id: p.debt_id as number,
    amount: Number(p.amount) || 0,
    paid_on: p.paid_on as string,
    note: (p.note as string) ?? "",
    created_at: p.created_at as string,
  }));

  return (
    <Shell back={{ href: "/", label: "Apps" }} title="Debt">
      <DebtView debts={debts} payments={payments} />
    </Shell>
  );
}
