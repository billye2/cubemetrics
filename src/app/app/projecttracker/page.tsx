import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { Shell } from "@/components/modern/Shell";
import { ProjectView } from "./ProjectView";

export const dynamic = "force-dynamic";

export interface ProjectTask {
  id: number;
  title: string;
  completed: boolean;
  sort_order: number;
}

export interface Project {
  id: number;
  title: string;
  status: string;
  next_action: string;
  due_date: string | null;
  note: string;
  blocked_reason: string;
  blocked_at: string | null;
  created_at: string;
  tasks: ProjectTask[];
}

export default async function ProjectTrackerPage() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: projectRows } = await supabase
    .from("projects")
    .select("id, title, status, next_action, due_date, note, blocked_reason, blocked_at, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(200);

  const projectsBase = projectRows || [];
  const ids = projectsBase.map((p) => p.id as number);

  const tasksByProject: Record<number, ProjectTask[]> = {};
  if (ids.length > 0) {
    const { data: taskRows } = await supabase
      .from("project_tasks")
      .select("id, project_id, title, completed, sort_order, created_at")
      .eq("user_id", user.id)
      .in("project_id", ids)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true })
      .limit(2000);
    for (const t of taskRows || []) {
      (tasksByProject[t.project_id as number] ??= []).push({
        id: t.id as number,
        title: t.title as string,
        completed: Boolean(t.completed),
        sort_order: (t.sort_order as number) ?? 0,
      });
    }
  }

  const projects: Project[] = projectsBase.map((p) => ({
    id: p.id as number,
    title: p.title as string,
    status: (p.status as string) ?? "planning",
    next_action: (p.next_action as string) ?? "",
    due_date: (p.due_date as string) ?? null,
    note: (p.note as string) ?? "",
    blocked_reason: (p.blocked_reason as string) ?? "",
    blocked_at: (p.blocked_at as string) ?? null,
    created_at: (p.created_at as string) ?? "",
    tasks: tasksByProject[p.id as number] ?? [],
  }));

  return (
    <Shell back={{ href: "/", label: "Apps" }} title="Projects">
      <ProjectView projects={projects} />
    </Shell>
  );
}
