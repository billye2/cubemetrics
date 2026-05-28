"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabase } from "@/lib/supabase/server";

async function requireUser() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return { supabase, userId: user.id };
}

export async function addEventAction(formData: FormData) {
  const title = String(formData.get("title") || "").trim();
  const start_date = String(formData.get("start_date") || "").trim();
  const start_time = String(formData.get("start_time") || "").trim() || null;
  const description = String(formData.get("description") || "").trim();
  if (!title || !start_date) return;
  const { supabase, userId } = await requireUser();
  await supabase.from("calendar_events").insert({
    user_id: userId,
    title,
    start_date,
    start_time,
    description,
  });
  revalidatePath("/app/calendar");
}

export async function deleteEventAction(id: number) {
  const { supabase, userId } = await requireUser();
  await supabase.from("calendar_events").delete().eq("id", id).eq("user_id", userId);
  revalidatePath("/app/calendar");
}
