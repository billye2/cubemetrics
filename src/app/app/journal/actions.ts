"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";

async function requireUser() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return { supabase, userId: user.id };
}

export async function addEntryAction(formData: FormData) {
  const body = String(formData.get("body") || "").trim();
  const title = String(formData.get("title") || "").trim();
  const mood = String(formData.get("mood") || "").trim() || null;
  if (!body) return;
  const { supabase, userId } = await requireUser();
  await supabase
    .from("journal_entries")
    .insert({ user_id: userId, body, title, mood });
  revalidatePath("/app/journal");
  redirect("/app/journal");
}

export async function deleteEntryAction(id: number) {
  const { supabase, userId } = await requireUser();
  await supabase.from("journal_entries").delete().eq("id", id).eq("user_id", userId);
  revalidatePath("/app/journal");
}
