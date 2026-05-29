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

const PATH = "/app/keepintouch";

function cleanCadence(days: number): number | null {
  if (!Number.isFinite(days) || days <= 0) return null;
  return Math.min(Math.floor(days), 3650);
}

export async function addContact(name: string, cadenceDays: number, company: string) {
  const trimmed = name.trim();
  if (!trimmed) return;
  const { supabase, userId } = await requireUser();
  await supabase.from("contacts").insert({
    user_id: userId,
    name: trimmed.slice(0, 120),
    company: company.trim().slice(0, 120) || null,
    cadence_days: cleanCadence(cadenceDays),
  });
  revalidatePath(PATH);
}

/** Log that you reached out today — stamps last_contacted and reschedules. */
export async function logTouch(id: number) {
  const { supabase, userId } = await requireUser();
  await supabase
    .from("contacts")
    .update({ last_contacted: new Date().toISOString().split("T")[0] })
    .eq("id", id)
    .eq("user_id", userId);
  revalidatePath(PATH);
}

export async function setCadence(id: number, cadenceDays: number) {
  const { supabase, userId } = await requireUser();
  await supabase
    .from("contacts")
    .update({ cadence_days: cleanCadence(cadenceDays) })
    .eq("id", id)
    .eq("user_id", userId);
  revalidatePath(PATH);
}

export async function deleteContact(id: number) {
  const { supabase, userId } = await requireUser();
  await supabase.from("contacts").delete().eq("id", id).eq("user_id", userId);
  revalidatePath(PATH);
}
