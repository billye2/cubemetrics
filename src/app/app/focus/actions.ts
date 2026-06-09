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

// A focus session is one daily_trackers row (tracker_type "focus"): `value` is
// the actual minutes (read by XP / weekly review / the spine), `label` is the
// intention, and the rest packs into `note` as JSON. `met` is true | "partly" |
// false; `rating` is the 1–5 focus score. Legacy fields (`done`) still parse.
export interface FocusNote {
  win: string;
  rating: number;
  done?: string;
  tag?: string;
  planned?: number;
  met?: boolean | "partly";
}

export interface FocusInput {
  minutes: number;
  intent: string;
  tag: string;
  planned: number;
  win: string;
  rating: number;
  met: boolean | "partly";
}

function buildNote(i: FocusInput): string {
  const note: FocusNote = {
    win: i.win.trim() || "Showed up and put in the time.",
    rating: Math.min(5, Math.max(1, Math.round(i.rating) || 3)),
    tag: i.tag,
    planned: Math.max(1, Math.round(i.planned)),
    met: i.met,
  };
  return JSON.stringify(note);
}

export async function saveFocusSessionAction(input: FocusInput) {
  const rounded = Math.round(input.minutes);
  if (rounded <= 0) return;
  const { supabase, userId } = await requireUser();
  await supabase.from("daily_trackers").insert({
    user_id: userId,
    tracker_type: "focus",
    value: rounded,
    label: input.intent.trim() || null,
    note: buildNote(input),
  });
  revalidatePath("/app/focus");
  revalidatePath("/today");
}

export async function updateFocusSessionAction(id: number, input: FocusInput) {
  const rounded = Math.round(input.minutes);
  if (rounded <= 0) return;
  const { supabase, userId } = await requireUser();
  await supabase
    .from("daily_trackers")
    .update({ value: rounded, label: input.intent.trim() || null, note: buildNote(input) })
    .eq("id", id)
    .eq("user_id", userId)
    .eq("tracker_type", "focus");
  revalidatePath("/app/focus");
  revalidatePath("/today");
}

export async function deleteFocusEntryAction(id: number) {
  const { supabase, userId } = await requireUser();
  await supabase
    .from("daily_trackers")
    .delete()
    .eq("id", id)
    .eq("user_id", userId)
    .eq("tracker_type", "focus");
  revalidatePath("/app/focus");
  revalidatePath("/today");
}
