import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { Shell } from "@/components/modern/Shell";
import { CalendarView, type Event } from "./CalendarView";

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");

  // Wide window so the month grid can page back/forward without refetching.
  const from = new Date();
  from.setMonth(from.getMonth() - 6);
  const to = new Date();
  to.setMonth(to.getMonth() + 12);

  const { data } = await supabase
    .from("calendar_events")
    .select("id, title, description, start_date, start_time, end_date")
    .eq("user_id", user.id)
    .gte("start_date", from.toISOString().slice(0, 10))
    .lte("start_date", to.toISOString().slice(0, 10))
    .order("start_date", { ascending: true })
    .order("start_time", { ascending: true, nullsFirst: true })
    .limit(1000);

  const today = new Date().toISOString().slice(0, 10);

  return (
    <Shell back={{ href: "/", label: "Apps" }} title="Calendar">
      <CalendarView events={(data || []) as Event[]} today={today} />
    </Shell>
  );
}
