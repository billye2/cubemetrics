"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabase } from "@/lib/supabase/server";
import { IMPORT_ROW_CAP, parseImport, parseTags } from "./lib";

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
  lastVerified?: string;
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
    last_verified: cleanDate(input.lastVerified),
  });
  revalidatePath(PATH);
}

/**
 * Bulk-create entries from a pasted directory listing (P3). The raw paste is
 * re-parsed server-side so a tampered client can't smuggle extra fields, and
 * the row count is capped to keep the insert bounded.
 */
export async function bulkAddFileEntries(text: string) {
  const parsed = parseImport(text ?? "").slice(0, IMPORT_ROW_CAP);
  if (parsed.length === 0) return 0;
  const { supabase, userId } = await requireUser();
  const rows = parsed.map((r) => ({
    user_id: userId,
    name: r.name.trim().slice(0, 200),
    location: r.location?.trim().slice(0, 1000) || null,
    type: null,
    tags: [],
    size_bytes: cleanSize(r.sizeBytes),
    file_date: cleanDate(r.fileDate),
    description: null,
    last_verified: null,
  }));
  await supabase.from("file_index").insert(rows);
  revalidatePath(PATH);
  return rows.length;
}

/**
 * Stamp (or clear) the "last verified" date on an entry — used to confirm a
 * piece of physical media still lives where the catalog says (P3). Pass a
 * YYYY-MM-DD string to set, or null/empty to clear.
 */
export async function setLastVerified(id: number, date: string | null) {
  const { supabase, userId } = await requireUser();
  await supabase
    .from("file_index")
    .update({ last_verified: cleanDate(date) })
    .eq("id", id)
    .eq("user_id", userId);
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
    lastVerified?: string | null;
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
  if (patch.lastVerified !== undefined) update.last_verified = cleanDate(patch.lastVerified);
  if (Object.keys(update).length === 0) return;
  await supabase.from("file_index").update(update).eq("id", id).eq("user_id", userId);
  revalidatePath(PATH);
}

export async function deleteFileEntry(id: number) {
  const { supabase, userId } = await requireUser();
  await supabase.from("file_index").delete().eq("id", id).eq("user_id", userId);
  revalidatePath(PATH);
}
