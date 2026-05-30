"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabase } from "@/lib/supabase/server";
import { cleanCadence, parseTags } from "./lib";

const PATH = "/app/contacts";

async function requireUser() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return { supabase, userId: user.id };
}

function str(formData: FormData, key: string, max = 200): string {
  return String(formData.get(key) || "").trim().slice(0, max);
}

function dateOrNull(formData: FormData, key: string): string | null {
  const v = str(formData, key, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null;
}

export async function addContact(formData: FormData) {
  const name = str(formData, "name", 120);
  if (!name) return;
  const { supabase, userId } = await requireUser();
  await supabase.from("contacts").insert({
    user_id: userId,
    name,
    email: str(formData, "email", 200) || null,
    phone: str(formData, "phone", 60) || null,
    company: str(formData, "company", 120) || null,
    note: str(formData, "note", 2000) || null,
    tags: parseTags(str(formData, "tags", 300)),
    cadence_days: cleanCadence(Number(formData.get("cadence_days") || 0)),
    birthday: dateOrNull(formData, "birthday"),
  });
  revalidatePath(PATH);
}

export async function updateContact(id: number, formData: FormData) {
  const name = str(formData, "name", 120);
  if (!name) return;
  const { supabase, userId } = await requireUser();
  await supabase
    .from("contacts")
    .update({
      name,
      email: str(formData, "email", 200) || null,
      phone: str(formData, "phone", 60) || null,
      company: str(formData, "company", 120) || null,
      note: str(formData, "note", 2000) || null,
      tags: parseTags(str(formData, "tags", 300)),
      cadence_days: cleanCadence(Number(formData.get("cadence_days") || 0)),
      birthday: dateOrNull(formData, "birthday"),
    })
    .eq("id", id)
    .eq("user_id", userId);
  revalidatePath(PATH);
}

/** Stamp last_contacted = today in one tap ("logged a chat"). */
export async function logContact(id: number) {
  const { supabase, userId } = await requireUser();
  await supabase
    .from("contacts")
    .update({ last_contacted: new Date().toISOString().split("T")[0] })
    .eq("id", id)
    .eq("user_id", userId);
  revalidatePath(PATH);
}

export async function deleteContact(id: number) {
  const { supabase, userId } = await requireUser();
  await supabase.from("contacts").delete().eq("id", id).eq("user_id", userId);
  revalidatePath(PATH);
}
