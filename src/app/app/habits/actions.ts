"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabase } from "@/lib/supabase/server";

async function requireUser() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return { supabase, userId: user.id };
}

export async function addHabit(name: string) {
  const trimmed = name.trim();
  if (!trimmed) return;
  const { supabase, userId } = await requireUser();
  await supabase.from("habits").insert({ user_id: userId, name: trimmed });
  revalidatePath("/app/habits");
}

export async function checkInAction(habitId: number) {
  const { supabase, userId } = await requireUser();
  const today = new Date().toISOString().split("T")[0];

  // Guard against double check-in
  const { data: existing } = await supabase
    .from("habit_checkins")
    .select("id")
    .eq("habit_id", habitId)
    .eq("user_id", userId)
    .eq("checkin_date", today)
    .limit(1);

  if (existing && existing.length > 0) {
    revalidatePath("/app/habits");
    return;
  }

  await supabase
    .from("habit_checkins")
    .insert({ habit_id: habitId, user_id: userId, checkin_date: today });
  revalidatePath("/app/habits");
}

export async function deleteHabitAction(id: number) {
  const { supabase, userId } = await requireUser();
  await supabase
    .from("habits")
    .update({ active: false })
    .eq("id", id)
    .eq("user_id", userId);
  revalidatePath("/app/habits");
}
