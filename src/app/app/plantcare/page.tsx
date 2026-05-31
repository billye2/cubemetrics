import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { Shell } from "@/components/modern/Shell";
import { PlantcareView } from "./PlantcareView";
import { sortPlants, toPlant, type PlantRow } from "./lib";

export const dynamic = "force-dynamic";

export default async function PlantcarePage() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data } = await supabase
    .from("plants")
    .select(
      "id, name, frequency_days, last_watered, light, note, photo_url, fertilize_days, last_fertilized, created_at",
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(500);

  const today = new Date();
  const plants = sortPlants(((data as PlantRow[]) || []).map((r) => toPlant(r, today)));

  return (
    <Shell back={{ href: "/apps", label: "Apps" }} title="Plants">
      <PlantcareView plants={plants} />
    </Shell>
  );
}
