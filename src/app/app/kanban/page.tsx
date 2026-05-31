import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { Shell } from "@/components/modern/Shell";
import { KanbanView } from "./KanbanView";

export const dynamic = "force-dynamic";

export interface KanbanCard {
  id: number;
  title: string;
  lane: string;
}

export default async function KanbanPage() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data } = await supabase
    .from("kanban_cards")
    .select("id, title, column_name, sort_order, created_at")
    .eq("user_id", user.id)
    .eq("board_type", "default")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true })
    .limit(500);

  const cards: KanbanCard[] = (data || []).map((c) => ({
    id: c.id as number,
    title: c.title as string,
    lane: (c.column_name as string) ?? "todo",
  }));

  return (
    <Shell back={{ href: "/apps", label: "Apps" }} title="Kanban">
      <KanbanView cards={cards} />
    </Shell>
  );
}
