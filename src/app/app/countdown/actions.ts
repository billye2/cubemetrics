"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabase } from "@/lib/supabase/server";

async function requireUser() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return { supabase, userId: user.id };
}

export async function addCountdownAction(
  title: string,
  targetDate: string,
  targetTime: string,
  category: string,
  recurringYearly: boolean,
  note: string,
  emoji = "",
) {
  const cleanTitle = title.trim();
  if (!cleanTitle || !targetDate) return;
  const { supabase, userId } = await requireUser();
  const base = {
    user_id: userId,
    title: cleanTitle,
    target_date: targetDate,
    target_time: targetTime || null,
    category: category.trim() || null,
    recurring_yearly: recurringYearly,
    note: note.trim() || null,
  };
  const { error } = await supabase.from("countdowns").insert({ ...base, emoji: emoji.trim() || null });
  // Degrade gracefully if the `emoji` column hasn't been added yet — still save
  // the countdown (without the custom emoji) rather than failing the write.
  if (error) await supabase.from("countdowns").insert(base);
  revalidatePath("/app/countdown");
}

export async function updateCountdownAction(
  id: number,
  title: string,
  targetDate: string,
  targetTime: string,
  category: string,
  recurringYearly: boolean,
  note: string,
  emoji = "",
) {
  const cleanTitle = title.trim();
  if (!cleanTitle || !targetDate) return;
  const { supabase, userId } = await requireUser();
  const base = {
    title: cleanTitle,
    target_date: targetDate,
    target_time: targetTime || null,
    category: category.trim() || null,
    recurring_yearly: recurringYearly,
    note: note.trim() || null,
  };
  const { error } = await supabase
    .from("countdowns")
    .update({ ...base, emoji: emoji.trim() || null })
    .eq("id", id)
    .eq("user_id", userId);
  // Degrade gracefully if the `emoji` column is missing (see addCountdownAction).
  if (error) await supabase.from("countdowns").update(base).eq("id", id).eq("user_id", userId);
  revalidatePath("/app/countdown");
}

export async function deleteCountdownAction(id: number) {
  const { supabase, userId } = await requireUser();
  await supabase
    .from("countdowns")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);
  revalidatePath("/app/countdown");
}
