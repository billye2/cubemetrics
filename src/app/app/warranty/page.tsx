import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { Shell } from "@/components/modern/Shell";
import { WarrantyView } from "./WarrantyView";
import { sortWarranties, toWarranty, type WarrantyRow } from "./lib";

export const dynamic = "force-dynamic";

export default async function WarrantyPage() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data } = await supabase
    .from("warranties")
    .select("id, name, purchase_date, warranty_months, store, note, receipt_url, archived, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(500);

  const today = new Date();
  const all = ((data as WarrantyRow[]) || []).map((r) => toWarranty(r, today));
  const active = sortWarranties(all.filter((w) => !w.archived));
  const archived = all.filter((w) => w.archived);

  return (
    <Shell back={{ href: "/", label: "Apps" }} title="Warranties">
      <WarrantyView warranties={active} archived={archived} />
    </Shell>
  );
}
