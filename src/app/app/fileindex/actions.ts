"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabase } from "@/lib/supabase/server";
import { parseTags } from "./lib";

async function requireUser() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return { supabase, userId: user.id };
}

const PATH = "/app/fileindex";

function cleanDate(d: string | undefined | null): string | null {
  if (!d) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return null;
  const parsed = new Date(d);
  if (Number.isNaN(parsed.getTime())) return null;
  return d;
}

function cleanSize(n: number | undefined | null): number | null {
  if (n == null || !Number.isFinite(n) || n < 0) return null;
  return Math.floor(n);
}

export async function addFileEntry(input: {
  name: string;
  location?: string;
  type?: string;
  tags?: string;
  sizeBytes?: number;
  fileDate?: string;
  description?: string;
}) {
  const name = input.name.trim();
  if (!name) return;
  const { supabase, userId } = await requireUser();
  await supabase.from("file_index").insert({
    user_id: userId,
    name: name.slice(0, 200),
    location: input.location?.trim().slice(0, 1000) || null,
    type: input.type?.trim().slice(0, 60) || null,
    tags: parseTags(input.tags ?? ""),
    size_bytes: cleanSize(input.sizeBytes),
    file_date: cleanDate(input.fileDate),
    description: input.description?.trim().slice(0, 1000) || null,
  });
  revalidatePath(PATH);
}

export async function updateFileEntry(
  id: number,
  patch: {
    name?: string;
    location?: string;
    type?: string;
    tags?: string;
    sizeBytes?: number | null;
    fileDate?: string;
    description?: string;
  },
) {
  const { supabase, userId } = await requireUser();
  const update: Record<string, unknown> = {};
  if (patch.name !== undefined) {
    const n = patch.name.trim();
    if (!n) return; // never blank out the only required field
    update.name = n.slice(0, 200);
  }
  if (patch.location !== undefined) update.location = patch.location.trim().slice(0, 1000) || null;
  if (patch.type !== undefined) update.type = patch.type.trim().slice(0, 60) || null;
  if (patch.tags !== undefined) update.tags = parseTags(patch.tags);
  if (patch.sizeBytes !== undefined) update.size_bytes = cleanSize(patch.sizeBytes);
  if (patch.fileDate !== undefined) update.file_date = cleanDate(patch.fileDate);
  if (patch.description !== undefined)
    update.description = patch.description.trim().slice(0, 1000) || null;
  if (Object.keys(update).length === 0) return;
  await supabase.from("file_index").update(update).eq("id", id).eq("user_id", userId);
  revalidatePath(PATH);
}

export async function deleteFileEntry(id: number) {
  const { supabase, userId } = await requireUser();
  await supabase.from("file_index").delete().eq("id", id).eq("user_id", userId);
  revalidatePath(PATH);
}
