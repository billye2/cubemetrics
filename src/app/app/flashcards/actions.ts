"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabase } from "@/lib/supabase/server";

const PATH = "/app/flashcards";

export type Rating = "again" | "hard" | "good" | "easy";

async function requireUser() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return { supabase, userId: user.id };
}

function isoDatePlus(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

export async function addCardAction(deck: string, front: string, back: string) {
  const f = front.trim();
  const b = back.trim();
  if (!f || !b) return;
  const { supabase, userId } = await requireUser();
  await supabase.from("flashcards").insert({
    user_id: userId,
    deck: deck.trim() || "General",
    front: f,
    back: b,
  });
  revalidatePath(PATH);
}

export async function deleteCardAction(id: number) {
  const { supabase, userId } = await requireUser();
  await supabase.from("flashcards").delete().eq("id", id).eq("user_id", userId);
  revalidatePath(PATH);
}

/**
 * SM-2-lite scheduler. Maps a recall rating to the next ease/interval/due date.
 * "again" resets the card; better ratings push the next review further out,
 * scaled by the card's accumulated ease factor.
 */
export async function reviewCardAction(
  id: number,
  rating: Rating,
  ease: number,
  interval: number,
  reps: number,
) {
  const { supabase, userId } = await requireUser();

  let nextEase = ease;
  let nextInterval = interval;
  let nextReps = reps;

  switch (rating) {
    case "again":
      nextEase = Math.max(1.3, ease - 0.2);
      nextInterval = 0;
      nextReps = 0;
      break;
    case "hard":
      nextEase = Math.max(1.3, ease - 0.15);
      nextInterval = Math.max(1, Math.round((interval || 1) * 1.2));
      nextReps = reps + 1;
      break;
    case "good":
      nextInterval = reps === 0 ? 1 : Math.max(1, Math.round(interval * ease));
      nextReps = reps + 1;
      break;
    case "easy":
      nextEase = ease + 0.15;
      nextInterval = reps === 0 ? 3 : Math.max(1, Math.round(interval * ease * 1.3));
      nextReps = reps + 1;
      break;
  }

  await supabase
    .from("flashcards")
    .update({
      ease: nextEase,
      interval: nextInterval,
      reps: nextReps,
      due_date: isoDatePlus(nextInterval),
    })
    .eq("id", id)
    .eq("user_id", userId);
  revalidatePath(PATH);
}
