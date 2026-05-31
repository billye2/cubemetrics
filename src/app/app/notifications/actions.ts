"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabase } from "@/lib/supabase/server";

export async function saveNotificationPrefs(prefs: {
  email_enabled: boolean;
  morning_enabled: boolean;
  evening_enabled: boolean;
  morning_time: string;
  evening_time: string;
  streak_save_enabled: boolean;
  ai_insights_enabled: boolean;
}) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  await supabase
    .from("notification_prefs")
    .upsert({ user_id: user.id, ...prefs }, { onConflict: "user_id" });

  revalidatePath("/app/notifications");
}
