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

const PATH = "/app/clienttracker";
export const STATUSES = ["lead", "active", "done", "lost"] as const;
type Status = (typeof STATUSES)[number];

function cleanStatus(status: string): Status {
  return (STATUSES as readonly string[]).includes(status) ? (status as Status) : "lead";
}

function cleanDate(value: string): string | null {
  const v = value.trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null;
}

function cleanValue(value: string): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n * 100) / 100;
}

export async function addClient(name: string, status: string) {
  const n = name.trim();
  if (!n) return;
  const { supabase, userId } = await requireUser();
  await supabase.from("clients").insert({
    user_id: userId,
    name: n.slice(0, 120),
    status: cleanStatus(status),
  });
  revalidatePath(PATH);
}

export async function setStatus(id: number, status: string) {
  const { supabase, userId } = await requireUser();
  await supabase
    .from("clients")
    .update({ status: cleanStatus(status) })
    .eq("id", id)
    .eq("user_id", userId);
  revalidatePath(PATH);
}

export async function updateClient(
  id: number,
  fields: {
    name?: string;
    email?: string;
    phone?: string;
    value?: string;
    next_action?: string;
    next_action_date?: string;
    note?: string;
    status?: string;
  },
) {
  const { supabase, userId } = await requireUser();

  const update: Record<string, string | number | null> = {};
  if (fields.name !== undefined) {
    const n = fields.name.trim();
    if (!n) return; // name is required
    update.name = n.slice(0, 120);
  }
  if (fields.email !== undefined) update.email = fields.email.trim().slice(0, 200);
  if (fields.phone !== undefined) update.phone = fields.phone.trim().slice(0, 60);
  if (fields.value !== undefined) update.value = cleanValue(fields.value);
  if (fields.next_action !== undefined)
    update.next_action = fields.next_action.trim().slice(0, 200);
  if (fields.next_action_date !== undefined)
    update.next_action_date = cleanDate(fields.next_action_date);
  if (fields.note !== undefined) update.note = fields.note.trim().slice(0, 2000);
  if (fields.status !== undefined) update.status = cleanStatus(fields.status);

  if (Object.keys(update).length === 0) return;

  await supabase.from("clients").update(update).eq("id", id).eq("user_id", userId);
  revalidatePath(PATH);
}

export async function deleteClient(id: number) {
  const { supabase, userId } = await requireUser();
  await supabase.from("clients").delete().eq("id", id).eq("user_id", userId);
  revalidatePath(PATH);
}
