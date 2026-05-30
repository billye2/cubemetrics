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

const PATH = "/app/weeklyreview";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function clean(s: string): string {
  return s.trim().slice(0, 5000);
}

/**
 * Create or update the single review for `weekStart` (a Monday, YYYY-MM-DD).
 * One review per week per user — upserts on (user_id, week_start).
 */
export async function saveReview(
  weekStart: string,
  fields: { wins: string; misses: string; lessons: string; next_focus: string },
) {
  if (!ISO_DATE.test(weekStart)) throw new Error("Bad week");
  const { supabase, userId } = await requireUser();
  await supabase
    .from("weekly_reviews")
    .upsert(
      {
        user_id: userId,
        week_start: weekStart,
        wins: clean(fields.wins),
        misses: clean(fields.misses),
        lessons: clean(fields.lessons),
        next_focus: clean(fields.next_focus),
      },
      { onConflict: "user_id,week_start" },
    );
  revalidatePath(PATH);
}

export async function deleteReview(weekStart: string) {
  if (!ISO_DATE.test(weekStart)) throw new Error("Bad week");
  const { supabase, userId } = await requireUser();
  await supabase
    .from("weekly_reviews")
    .delete()
    .eq("user_id", userId)
    .eq("week_start", weekStart);
  revalidatePath(PATH);
}
