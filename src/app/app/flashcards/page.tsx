import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { Shell } from "@/components/modern/Shell";
import { FlashcardsView, type Card } from "./FlashcardsView";

export const dynamic = "force-dynamic";

export default async function FlashcardsPage() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data } = await supabase
    .from("flashcards")
    .select("id, deck, front, back, ease, interval, reps, due_date, created_at")
    .eq("user_id", user.id)
    .order("deck", { ascending: true })
    .order("created_at", { ascending: false })
    .limit(1000);

  const cards = (data || []) as Card[];
  const today = new Date().toISOString().split("T")[0];
  const dueCount = cards.filter((c) => c.due_date <= today).length;
  const mastered = cards.filter((c) => c.reps >= 3).length;

  return (
    <Shell back={{ href: "/apps", label: "Apps" }} title="Flashcards">
      <FlashcardsView cards={cards} today={today} dueCount={dueCount} mastered={mastered} />
    </Shell>
  );
}
