import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { Shell } from "@/components/modern/Shell";
import { VocabularyView, type Word } from "./VocabularyView";

export const dynamic = "force-dynamic";

export default async function VocabularyPage() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data } = await supabase
    .from("vocab_words")
    .select("id, word, definition, example, ease, interval, reps, due_date, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1000);

  const words = (data || []) as Word[];
  const today = new Date().toISOString().split("T")[0];
  const dueCount = words.filter((w) => w.due_date <= today).length;
  const mastered = words.filter((w) => w.reps >= 3).length;

  return (
    <Shell back={{ href: "/", label: "Apps" }} title="Vocabulary">
      <VocabularyView words={words} today={today} dueCount={dueCount} mastered={mastered} />
    </Shell>
  );
}
