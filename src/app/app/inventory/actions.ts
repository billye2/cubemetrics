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

const PATH = "/app/inventory";

function cleanQuantity(q: number): number {
  if (!Number.isFinite(q) || q <= 0) return 1;
  return Math.min(Math.floor(q), 1_000_000);
}

function cleanValue(v: number | undefined | null): number | null {
  if (v === undefined || v === null || !Number.isFinite(v) || v < 0) return null;
  // Cap at a sane ceiling and round to cents.
  return Math.min(Math.round(v * 100) / 100, 1_000_000_000);
}

function cleanUrl(url: string | undefined): string | null {
  const u = (url ?? "").trim();
  if (!u) return null;
  // Only accept http(s) URLs; reject anything else (e.g. javascript:).
  if (!/^https?:\/\//i.test(u)) return null;
  return u.slice(0, 1000);
}

export async function addItem(input: {
  name: string;
  quantity?: number;
  value?: number | null;
  location?: string;
  category?: string;
  photoUrl?: string;
}) {
  const name = input.name.trim();
  if (!name) return;
  const { supabase, userId } = await requireUser();
  await supabase.from("inventory_items").insert({
    user_id: userId,
    name: name.slice(0, 160),
    quantity: cleanQuantity(input.quantity ?? 1),
    value: cleanValue(input.value),
    location: input.location?.trim().slice(0, 120) || null,
    category: input.category?.trim().slice(0, 80) || null,
    photo_url: cleanUrl(input.photoUrl),
  });
  revalidatePath(PATH);
}

export async function updateItem(
  id: number,
  patch: {
    name?: string;
    quantity?: number;
    value?: number | null;
    location?: string;
    category?: string;
    photoUrl?: string;
  },
) {
  const { supabase, userId } = await requireUser();
  const update: Record<string, unknown> = {};
  if (patch.name !== undefined) {
    const name = patch.name.trim();
    if (!name) return;
    update.name = name.slice(0, 160);
  }
  if (patch.quantity !== undefined) update.quantity = cleanQuantity(patch.quantity);
  if (patch.value !== undefined) update.value = cleanValue(patch.value);
  if (patch.location !== undefined) update.location = patch.location.trim().slice(0, 120) || null;
  if (patch.category !== undefined) update.category = patch.category.trim().slice(0, 80) || null;
  if (patch.photoUrl !== undefined) update.photo_url = cleanUrl(patch.photoUrl);
  if (Object.keys(update).length === 0) return;
  await supabase.from("inventory_items").update(update).eq("id", id).eq("user_id", userId);
  revalidatePath(PATH);
}

export async function deleteItem(id: number) {
  const { supabase, userId } = await requireUser();
  await supabase.from("inventory_items").delete().eq("id", id).eq("user_id", userId);
  revalidatePath(PATH);
}
