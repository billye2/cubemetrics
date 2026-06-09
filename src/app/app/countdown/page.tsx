import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { Shell } from "@/components/modern/Shell";
import { CountdownsView } from "./CountdownsView";

export const dynamic = "force-dynamic";

export default async function CountdownPage() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data } = await supabase
    .from("countdowns")
    .select("id, title, target_date, target_time, category, recurring_yearly, note, created_at, emoji")
    .eq("user_id", user.id)
    .order("target_date", { ascending: true })
    .limit(200);

  return (
    <Shell back={{ href: "/apps", label: "Apps" }} title="Countdown">
      <CountdownsView rows={data || []} />
    </Shell>
  );
}
