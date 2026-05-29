"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabase } from "@/lib/supabase/server";
import { normalizeRecurrence } from "./lib";

async function requireUser() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return { supabase, userId: user.id };
}

// Shared parse of the event form fields used by add + update.
function parseEventForm(formData: FormData) {
  const title = String(formData.get("title") || "").trim();
  const start_date = String(formData.get("start_date") || "").trim();
  const start_time = String(formData.get("start_time") || "").trim() || null;
  const end_time = String(formData.get("end_time") || "").trim() || null;
  const end_date = String(formData.get("end_date") || "").trim() || null;
  const description = String(formData.get("description") || "").trim();
  const recurrence = normalizeRecurrence(String(formData.get("recurrence") || "").trim());
  return {
    title,
    start_date,
    start_time,
    end_time,
    // Only store an end_date when it's strictly after the start.
    end_date: end_date && end_date > start_date ? end_date : null,
    description,
    recurrence,
  };
}

export async function addEventAction(formData: FormData) {
  const fields = parseEventForm(formData);
  if (!fields.title || !fields.start_date) return;
  const { supabase, userId } = await requireUser();
  await supabase.from("calendar_events").insert({ user_id: userId, ...fields });
  revalidatePath("/app/calendar");
}

export async function updateEventAction(id: number, formData: FormData) {
  const fields = parseEventForm(formData);
  if (!fields.title || !fields.start_date) return;
  const { supabase, userId } = await requireUser();
  await supabase.from("calendar_events").update(fields).eq("id", id).eq("user_id", userId);
  revalidatePath("/app/calendar");
}

export async function deleteEventAction(id: number) {
  const { supabase, userId } = await requireUser();
  await supabase.from("calendar_events").delete().eq("id", id).eq("user_id", userId);
  revalidatePath("/app/calendar");
}
