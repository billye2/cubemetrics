import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { Shell } from "@/components/modern/Shell";
import { VisionBoardView } from "./VisionBoardView";
import { sortCards, toCard, type VisionCardRow } from "./lib";

export const dynamic = "force-dynamic";

export default async function VisionBoardPage() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data } = await supabase
    .from("vision_cards")
    .select("id, kind, text, image_url, section, position, created_at")
    .eq("user_id", user.id)
    .order("position", { ascending: true })
    .order("created_at", { ascending: false })
    .limit(300);

  const cards = sortCards((data || []).map((r) => toCard(r as VisionCardRow)));

  return (
    <Shell back={{ href: "/apps", label: "Apps" }} title="Vision Board">
      <VisionBoardView cards={cards} />
    </Shell>
  );
}
