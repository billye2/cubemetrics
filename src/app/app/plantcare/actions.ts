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

/** The recurrence engine: stamp last_watered = today, which advances next-due. */
export async function waterPlant(id: number) {
  const { supabase, userId } = await requireUser();
  await supabase
    .from("plants")
    .update({ last_watered: todayISO() })
    .eq("id", id)
    .eq("user_id", userId);
  revalidatePath(PATH);
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
