"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabase } from "@/lib/supabase/server";
import { cleanStatus } from "./lib";

async function requireUser() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return { supabase, userId: user.id };
}

const PATH = "/app/projecttracker";

/** Verify a project belongs to the caller before mutating its children. */
async function ownsProject(
  supabase: Awaited<ReturnType<typeof requireUser>>["supabase"],
  userId: string,
  projectId: number,
): Promise<boolean> {
  const { data } = await supabase
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("user_id", userId)
    .maybeSingle();
  return Boolean(data);
}

export async function addProject(title: string) {
  const t = title.trim();
  if (!t) return;
  const { supabase, userId } = await requireUser();
  await supabase.from("projects").insert({
    user_id: userId,
    title: t.slice(0, 160),
  });
  revalidatePath(PATH);
}

export async function setStatus(id: number, status: string) {
  const { supabase, userId } = await requireUser();
  await supabase
    .from("projects")
    .update({ status: cleanStatus(status) })
    .eq("id", id)
    .eq("user_id", userId);
  revalidatePath(PATH);
}

export async function setNextAction(id: number, nextAction: string) {
  const { supabase, userId } = await requireUser();
  await supabase
    .from("projects")
    .update({ next_action: nextAction.trim().slice(0, 240) })
    .eq("id", id)
    .eq("user_id", userId);
  revalidatePath(PATH);
}

export async function setDueDate(id: number, dueDate: string) {
  const { supabase, userId } = await requireUser();
  const value = dueDate.trim() ? dueDate.trim() : null;
  await supabase
    .from("projects")
    .update({ due_date: value })
    .eq("id", id)
    .eq("user_id", userId);
  revalidatePath(PATH);
}

export async function deleteProject(id: number) {
  const { supabase, userId } = await requireUser();
  // project_tasks cascade via FK on delete.
  await supabase.from("projects").delete().eq("id", id).eq("user_id", userId);
  revalidatePath(PATH);
}

export async function addTask(projectId: number, title: string) {
  const t = title.trim();
  if (!t) return;
  const { supabase, userId } = await requireUser();
  if (!(await ownsProject(supabase, userId, projectId))) return;
  await supabase.from("project_tasks").insert({
    user_id: userId,
    project_id: projectId,
    title: t.slice(0, 200),
  });
  revalidatePath(PATH);
}

export async function toggleTask(taskId: number, completed: boolean) {
  const { supabase, userId } = await requireUser();
  await supabase
    .from("project_tasks")
    .update({ completed })
    .eq("id", taskId)
    .eq("user_id", userId);
  revalidatePath(PATH);
}

export async function deleteTask(taskId: number) {
  const { supabase, userId } = await requireUser();
  await supabase.from("project_tasks").delete().eq("id", taskId).eq("user_id", userId);
  revalidatePath(PATH);
}
