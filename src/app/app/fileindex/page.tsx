import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { Shell } from "@/components/modern/Shell";
import { FileIndexView } from "./FileIndexView";
import { toFileEntry, type FileEntryRow } from "./lib";

export const dynamic = "force-dynamic";

export default async function FileIndexPage() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data } = await supabase
    .from("file_index")
    .select(
      "id, name, location, type, tags, size_bytes, file_date, description, last_verified, created_at",
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1000);

  const entries = ((data as FileEntryRow[]) || []).map(toFileEntry);

  return (
    <Shell back={{ href: "/", label: "Apps" }} title="File Index">
      <FileIndexView entries={entries} />
    </Shell>
  );
}
