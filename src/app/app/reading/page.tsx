import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { Shell } from "@/components/modern/Shell";
import { ReadingView } from "./ReadingView";

export const dynamic = "force-dynamic";

export type BookStatus = "to_read" | "reading" | "completed" | "dropped";

export interface BookRow {
  id: number;
  title: string;
  author: string;
  status: BookStatus;
  rating: number | null;
  notes: string;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
}

export default async function ReadingPage() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data } = await supabase
    .from("reading_list")
    .select(
      "id, title, author, status, rating, notes, started_at, finished_at, created_at"
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(500);

  return (
    <Shell back={{ href: "/", label: "Apps" }} title="Reading">
      <ReadingView books={(data || []) as BookRow[]} />
    </Shell>
  );
}
