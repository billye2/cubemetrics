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
  const windowStart = from.toISOString().slice(0, 10);
  const windowEnd = to.toISOString().slice(0, 10);

  // Pull one-off events inside the window plus every recurring series (whatever
  // its anchor date) — recurring rows expand into in-window occurrences on read.
  const { data } = await supabase
    .from("calendar_events")
    .select("id, title, description, start_date, start_time, end_date, end_time, recurrence")
    .eq("user_id", user.id)
    .or(`recurrence.not.is.null,and(start_date.gte.${windowStart},start_date.lte.${windowEnd})`)
    .order("start_date", { ascending: true })
    .order("start_time", { ascending: true, nullsFirst: true })
    .limit(1000);

  const today = new Date().toISOString().slice(0, 10);

  return (
    <Shell back={{ href: "/", label: "Apps" }} title="Calendar">
      <CalendarView events={(data || []) as Event[]} today={today} windowStart={windowStart} windowEnd={windowEnd} />
    </Shell>
  );
}
