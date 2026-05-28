"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabase } from "@/lib/supabase/server";

async function requireUser() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return { supabase, userId: user.id };
}

export async function submitFeedbackAction(formData: FormData) {
  const body = String(formData.get("body") || "").trim();
  const category = String(formData.get("category") || "other").trim() || "other";
  if (!body) return;
  const { supabase, userId } = await requireUser();
  await supabase.from("user_feedback").insert({ user_id: userId, category, body });
  revalidatePath("/app/feedback");
}
