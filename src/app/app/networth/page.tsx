import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { Shell } from "@/components/modern/Shell";
import { NetWorthView } from "./NetWorthView";

export const dynamic = "force-dynamic";

export interface Account {
  id: number;
  name: string;
  kind: string;
  value: number;
}

export interface Snapshot {
  net: number;
  captured_on: string;
}

export default async function NetWorthPage() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const [{ data: accountsData }, { data: snapsData }] = await Promise.all([
    supabase
      .from("net_worth_accounts")
      .select("id, name, kind, value, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true }),
    supabase
      .from("net_worth_snapshots")
      .select("net, captured_on")
      .eq("user_id", user.id)
      .order("captured_on", { ascending: true })
      .limit(60),
  ]);

  const accounts: Account[] = (accountsData || []).map((a) => ({
    id: a.id as number,
    name: a.name as string,
    kind: (a.kind as string) ?? "asset",
    value: Number(a.value) || 0,
  }));

  const snapshots: Snapshot[] = (snapsData || []).map((s) => ({
    net: Number(s.net) || 0,
    captured_on: s.captured_on as string,
  }));

  return (
    <Shell back={{ href: "/apps", label: "Apps" }} title="Net Worth">
      <NetWorthView accounts={accounts} snapshots={snapshots} />
    </Shell>
  );
}
