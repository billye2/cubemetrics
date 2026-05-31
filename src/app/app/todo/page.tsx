import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { Shell } from "@/components/modern/Shell";
import { TrackUsage } from "@/components/modern/TrackUsage";
import { TodoView } from "./TodoView";

export const dynamic = "force-dynamic";

export default async function TodoPage() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data } = await supabase
    .from("todos")
    .select("id, title, completed, priority, created_at")
    .eq("user_id", user.id)
    .order("completed", { ascending: true })
    .order("priority", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <Shell back={{ href: "/apps", label: "Apps" }} title="Todo">
      <TrackUsage appId="todo" />
      <TodoView initialTodos={data || []} />
    </Shell>
  );
}
