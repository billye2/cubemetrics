import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { Shell } from "@/components/modern/Shell";
import { CalendarView } from "./CalendarView";

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const today = new Date().toISOString().slice(0, 10);

  const [{ data: upcoming }, { data: past }] = await Promise.all([
    supabase
      .from("calendar_events")
      .select("id, title, description, start_date, start_time")
      .eq("user_id", user.id)
      .gte("start_date", today)
      .order("start_date", { ascending: true })
      .order("start_time", { ascending: true, nullsFirst: true })
      .limit(100),
    supabase
      .from("calendar_events")
      .select("id, title, description, start_date, start_time")
      .eq("user_id", user.id)
      .lt("start_date", today)
      .order("start_date", { ascending: false })
      .order("start_time", { ascending: true, nullsFirst: true })
      .limit(50),
  ]);

  return (
    <Shell back={{ href: "/", label: "Apps" }} title="Calendar">
      <CalendarView upcoming={upcoming || []} past={past || []} />
    </Shell>
  );
}
