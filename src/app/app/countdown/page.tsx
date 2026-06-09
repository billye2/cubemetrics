import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { Shell } from "@/components/modern/Shell";
import { CountdownsView } from "./CountdownsView";
import type { Countdown } from "./lib";

export const dynamic = "force-dynamic";

const BASE_COLS = "id, title, target_date, target_time, category, recurring_yearly, note, created_at";

export default async function CountdownPage() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const list = (cols: string) =>
    supabase
      .from("countdowns")
      .select(cols)
      .eq("user_id", user.id)
      .order("target_date", { ascending: true })
      .limit(200);

  // Resilient to a DB where the `emoji` column hasn't been added yet: a missing
  // column makes the select error (data === null), which would otherwise blank
  // the whole list. Fall back to the base columns (emoji → undefined, which the
  // view renders as the category emoji) so countdowns always show.
  let rows = (await list(`${BASE_COLS}, emoji`)).data as Countdown[] | null;
  if (rows === null) rows = (await list(BASE_COLS)).data as unknown as Countdown[] | null;

  return (
    <Shell back={{ href: "/apps", label: "Apps" }} title="Countdown">
      <CountdownsView rows={rows ?? []} />
    </Shell>
  );
}
