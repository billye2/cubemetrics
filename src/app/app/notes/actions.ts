"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabase } from "@/lib/supabase/server";

async function requireUser() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return { supabase, userId: user.id };
}

export async function addNoteAction(formData: FormData) {
  const title = String(formData.get("title") || "").trim();
  const body = String(formData.get("body") || "").trim();
  if (!title && !body) return;
  const { supabase, userId } = await requireUser();
  await supabase.from("notes").insert({ user_id: userId, title, body });
  revalidatePath("/app/notes");
}

export async function deleteNoteAction(id: number) {
  const { supabase, userId } = await requireUser();
  await supabase.from("notes").delete().eq("id", id).eq("user_id", userId);
  revalidatePath("/app/notes");
}

export async function togglePinAction(id: number, pinned: boolean) {
  const { supabase, userId } = await requireUser();
  await supabase.from("notes").update({ pinned }).eq("id", id).eq("user_id", userId);
  revalidatePath("/app/notes");
}
