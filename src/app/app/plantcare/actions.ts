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

const PATH = "/app/plantcare";

function cleanFrequency(days: number): number {
  if (!Number.isFinite(days) || days <= 0) return 7;
  return Math.min(Math.floor(days), 365);
}

function cleanLight(light?: string): string | null {
  return light === "low" || light === "medium" || light === "bright" ? light : null;
}

function todayISO(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

function cleanDate(d?: string): string | null {
  if (!d || !/^\d{4}-\d{2}-\d{2}$/.test(d)) return null;
  const parsed = new Date(d);
  if (Number.isNaN(parsed.getTime())) return null;
  return d;
}

const PHOTO_BUCKET = "plant-photos";
const MAX_PHOTO_BYTES = 5 * 1024 * 1024; // 5 MB
const PHOTO_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

export async function addPlant(input: {
  name: string;
  frequencyDays: number;
  light?: string;
  note?: string;
  lastWatered?: string; // optional; defaults to today
}) {
  const name = input.name.trim();
  if (!name) return;
  const { supabase, userId } = await requireUser();
  await supabase.from("plants").insert({
    user_id: userId,
    name: name.slice(0, 160),
    frequency_days: cleanFrequency(input.frequencyDays),
    last_watered: cleanDate(input.lastWatered) ?? todayISO(),
    light: cleanLight(input.light),
    note: input.note?.trim().slice(0, 500) || null,
  });
  revalidatePath(PATH);
}

/**
 * The recurrence engine: stamp last_watered = today, which advances next-due.
 * P3 — also append a row to plant_waterings so the history sparkline has a log.
 */
export async function waterPlant(id: number) {
  const { supabase, userId } = await requireUser();
  const today = todayISO();
  await supabase
    .from("plants")
    .update({ last_watered: today })
    .eq("id", id)
    .eq("user_id", userId);
  // Append to the durable history. Scoped by plant_id + user_id (RLS-safe).
  await supabase
    .from("plant_waterings")
    .insert({ plant_id: id, user_id: userId, watered_on: today });
  revalidatePath(PATH);
}

/** P3 — second recurrence track: stamp last_fertilized = today. */
export async function fertilizePlant(id: number) {
  const { supabase, userId } = await requireUser();
  await supabase
    .from("plants")
    .update({ last_fertilized: todayISO() })
    .eq("id", id)
    .eq("user_id", userId);
  revalidatePath(PATH);
}

/**
 * P3 — turn the fertilizing track on (with a cadence) or off (days <= 0).
 * Turning it off clears the cadence; last_fertilized is preserved as history.
 */
export async function setFertilizeSchedule(id: number, days: number) {
  const { supabase, userId } = await requireUser();
  const clean = Number.isFinite(days) && days > 0 ? Math.min(Math.floor(days), 365) : null;
  await supabase
    .from("plants")
    .update({ fertilize_days: clean })
    .eq("id", id)
    .eq("user_id", userId);
  revalidatePath(PATH);
}

/**
 * P3 — upload a photo to Storage and stamp plants.photo_url. The object lives
 * under "<user_id>/<plant_id>-<ts>.<ext>" so the owner-scoped RLS policy admits
 * the write. Returns an error string for the client to surface, or null on ok.
 */
export async function uploadPlantPhoto(id: number, formData: FormData): Promise<string | null> {
  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0) return "No file selected.";
  if (file.size > MAX_PHOTO_BYTES) return "Image is too large (max 5 MB).";
  const ext = PHOTO_TYPES[file.type];
  if (!ext) return "Unsupported image type. Use JPEG, PNG, WebP, or GIF.";

  const { supabase, userId } = await requireUser();
  const path = `${userId}/${id}-${Date.now()}.${ext}`;
  const { error: upErr } = await supabase.storage
    .from(PHOTO_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: true });
  if (upErr) return "Upload failed. Please try again.";

  const { data } = supabase.storage.from(PHOTO_BUCKET).getPublicUrl(path);
  const publicUrl = data.publicUrl;
  await supabase
    .from("plants")
    .update({ photo_url: publicUrl })
    .eq("id", id)
    .eq("user_id", userId);
  revalidatePath(PATH);
  return null;
}

/** P3 — clear the photo. Best-effort removes the Storage object too. */
export async function removePlantPhoto(id: number) {
  const { supabase, userId } = await requireUser();
  const { data: rows } = await supabase
    .from("plants")
    .select("photo_url")
    .eq("id", id)
    .eq("user_id", userId)
    .limit(1);
  const url: string | undefined = rows?.[0]?.photo_url ?? undefined;
  if (url) {
    const marker = `/${PHOTO_BUCKET}/`;
    const idx = url.indexOf(marker);
    if (idx !== -1) {
      const objectPath = url.slice(idx + marker.length);
      await supabase.storage.from(PHOTO_BUCKET).remove([objectPath]);
    }
  }
  await supabase
    .from("plants")
    .update({ photo_url: null })
    .eq("id", id)
    .eq("user_id", userId);
  revalidatePath(PATH);
}

/** P3 — fetch recent watering dates for a plant's history sparkline. */
export async function getWateringHistory(id: number): Promise<string[]> {
  const { supabase, userId } = await requireUser();
  const { data } = await supabase
    .from("plant_waterings")
    .select("watered_on")
    .eq("plant_id", id)
    .eq("user_id", userId)
    .order("watered_on", { ascending: false })
    .limit(60);
  return ((data as { watered_on: string }[]) || []).map((r) => r.watered_on);
}

export async function updatePlant(
  id: number,
  patch: { name?: string; frequencyDays?: number; light?: string; note?: string },
) {
  const { supabase, userId } = await requireUser();
  const update: Record<string, unknown> = {};
  if (patch.name !== undefined) {
    const n = patch.name.trim();
    if (!n) return;
    update.name = n.slice(0, 160);
  }
  if (patch.frequencyDays !== undefined) update.frequency_days = cleanFrequency(patch.frequencyDays);
  if (patch.light !== undefined) update.light = cleanLight(patch.light);
  if (patch.note !== undefined) update.note = patch.note.trim().slice(0, 500) || null;
  if (Object.keys(update).length === 0) return;
  await supabase.from("plants").update(update).eq("id", id).eq("user_id", userId);
  revalidatePath(PATH);
}

export async function deletePlant(id: number) {
  const { supabase, userId } = await requireUser();
  await supabase.from("plants").delete().eq("id", id).eq("user_id", userId);
  revalidatePath(PATH);
}
