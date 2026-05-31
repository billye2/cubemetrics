import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { Shell } from "@/components/modern/Shell";
import { InventoryView } from "./InventoryView";
import { toItem, type InventoryRow } from "./lib";

export const dynamic = "force-dynamic";

export default async function InventoryPage() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data } = await supabase
    .from("inventory_items")
    .select("id, name, quantity, value, location, category, photo_url, receipt_url, warranty_url, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1000);

  const items = ((data as InventoryRow[]) || []).map(toItem);

  return (
    <Shell back={{ href: "/apps", label: "Apps" }} title="Inventory">
      <InventoryView items={items} />
    </Shell>
  );
}
