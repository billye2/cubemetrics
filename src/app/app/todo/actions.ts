"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabase } from "@/lib/supabase/server";

async function requireUser() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return { supabase, userId: user.id };
}

export async function addTodoAction(formData: FormData) {
  const title = String(formData.get("title") || "").trim();
  const priority = Number(formData.get("priority") || 0);
  if (!title) return;
  const { supabase, userId } = await requireUser();
  await supabase.from("todos").insert({ user_id: userId, title, priority });
  revalidatePath("/app/todo");
}

export async function toggleTodoAction(id: number, completed: boolean) {
  const { supabase, userId } = await requireUser();
  await supabase
    .from("todos")
    .update({
      completed,
      completed_at: completed ? new Date().toISOString() : null,
    })
    .eq("id", id)
    .eq("user_id", userId);
  revalidatePath("/app/todo");
}

export async function deleteTodoAction(id: number) {
  const { supabase, userId } = await requireUser();
  await supabase.from("todos").delete().eq("id", id).eq("user_id", userId);
  revalidatePath("/app/todo");
}
