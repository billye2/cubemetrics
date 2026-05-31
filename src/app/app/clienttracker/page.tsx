import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { Shell } from "@/components/modern/Shell";
import { ClientView } from "./ClientView";

export const dynamic = "force-dynamic";

export interface Client {
  id: number;
  name: string;
  status: string;
  email: string;
  phone: string;
  value: number;
  next_action: string;
  next_action_date: string | null;
  note: string;
}

export default async function ClientTrackerPage() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data } = await supabase
    .from("clients")
    .select(
      "id, name, status, email, phone, value, next_action, next_action_date, note, created_at",
    )
    .eq("user_id", user.id)
    .order("next_action_date", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(500);

  const clients: Client[] = (data || []).map((c) => ({
    id: c.id as number,
    name: c.name as string,
    status: (c.status as string) ?? "lead",
    email: (c.email as string) ?? "",
    phone: (c.phone as string) ?? "",
    value: Number(c.value) || 0,
    next_action: (c.next_action as string) ?? "",
    next_action_date: (c.next_action_date as string) ?? null,
    note: (c.note as string) ?? "",
  }));

  return (
    <Shell back={{ href: "/apps", label: "Apps" }} title="Clients">
      <ClientView clients={clients} />
    </Shell>
  );
}
