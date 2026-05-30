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

const PATH = "/app/warranty";

function cleanMonths(months: number): number {
  if (!Number.isFinite(months) || months <= 0) return 12;
  return Math.min(Math.floor(months), 1200); // cap at 100 years
}

function cleanDate(d: string): string | null {
  // Expect YYYY-MM-DD; reject anything else.
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return null;
  const parsed = new Date(d);
  if (Number.isNaN(parsed.getTime())) return null;
  return d;
}

export async function addWarranty(input: {
  name: string;
  purchaseDate: string;
  warrantyMonths: number;
  store?: string;
  note?: string;
}) {
  const name = input.name.trim();
  const purchaseDate = cleanDate(input.purchaseDate);
  if (!name || !purchaseDate) return;
  const { supabase, userId } = await requireUser();
  await supabase.from("warranties").insert({
    user_id: userId,
    name: name.slice(0, 160),
    purchase_date: purchaseDate,
    warranty_months: cleanMonths(input.warrantyMonths),
    store: input.store?.trim().slice(0, 120) || null,
    note: input.note?.trim().slice(0, 500) || null,
  });
  revalidatePath(PATH);
}

export async function updateWarranty(
  id: number,
  patch: { warrantyMonths?: number; store?: string; note?: string },
) {
  const { supabase, userId } = await requireUser();
  const update: Record<string, unknown> = {};
  if (patch.warrantyMonths !== undefined) update.warranty_months = cleanMonths(patch.warrantyMonths);
  if (patch.store !== undefined) update.store = patch.store.trim().slice(0, 120) || null;
  if (patch.note !== undefined) update.note = patch.note.trim().slice(0, 500) || null;
  if (Object.keys(update).length === 0) return;
  await supabase.from("warranties").update(update).eq("id", id).eq("user_id", userId);
  revalidatePath(PATH);
}

export async function setArchived(id: number, archived: boolean) {
  const { supabase, userId } = await requireUser();
  await supabase.from("warranties").update({ archived }).eq("id", id).eq("user_id", userId);
  revalidatePath(PATH);
}

export async function deleteWarranty(id: number) {
  const { supabase, userId } = await requireUser();
  await supabase.from("warranties").delete().eq("id", id).eq("user_id", userId);
  revalidatePath(PATH);
}
