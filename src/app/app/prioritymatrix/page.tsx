import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { Shell } from "@/components/modern/Shell";
import { MatrixView } from "./MatrixView";

export const dynamic = "force-dynamic";

export interface MatrixTask {
  id: number;
  title: string;
  quadrant: number;
}

export default async function PriorityMatrixPage() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data } = await supabase
    .from("todos")
    .select("id, title, quadrant, created_at")
    .eq("user_id", user.id)
    .eq("completed", false)
    .order("created_at", { ascending: true })
    .limit(300);

  const tasks: MatrixTask[] = (data || []).map((t) => ({
    id: t.id as number,
    title: t.title as string,
    quadrant: (t.quadrant as number) ?? 0,
  }));

  return (
    <Shell back={{ href: "/", label: "Apps" }} title="Priorities">
      <MatrixView tasks={tasks} />
    </Shell>
  );
}
