import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { Shell } from "@/components/modern/Shell";
import { TrackUsage } from "@/components/modern/TrackUsage";
import { JournalView } from "./JournalView";

export const dynamic = "force-dynamic";

export default async function JournalPage() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data } = await supabase
    .from("journal_entries")
    .select("id, title, body, mood, entry_date, created_at")
    .eq("user_id", user.id)
    .order("entry_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <Shell back={{ href: "/", label: "Apps" }} title="Journal">
      <TrackUsage appId="journal" />
      <JournalView entries={data || []} />
    </Shell>
  );
}
