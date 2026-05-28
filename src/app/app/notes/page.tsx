import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { Shell } from "@/components/modern/Shell";
import { NotesView } from "./NotesView";

export const dynamic = "force-dynamic";

export default async function NotesPage() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data } = await supabase
    .from("notes")
    .select("id, title, body, pinned, updated_at")
    .eq("user_id", user.id)
    .order("pinned", { ascending: false })
    .order("updated_at", { ascending: false })
    .limit(200);

  return (
    <Shell back={{ href: "/", label: "Apps" }} title="Notes">
      <NotesView notes={data || []} />
    </Shell>
  );
}
