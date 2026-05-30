"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabase } from "@/lib/supabase/server";
import { normalizeUrl, deriveTitle, faviconFor, parseTags, parseImport } from "./lib";

async function requireUser() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return { supabase, userId: user.id };
}

export async function addBookmarkAction(formData: FormData) {
  const url = normalizeUrl(String(formData.get("url") || ""));
  if (!url) return;
  const rawTitle = String(formData.get("title") || "").trim();
  const title = rawTitle || deriveTitle(url);
  const tags = parseTags(String(formData.get("tags") || ""));
  const folder = String(formData.get("folder") || "").trim() || null;
  const unread = formData.get("unread") != null;

  const { supabase, userId } = await requireUser();
  await supabase.from("bookmarks").insert({
    user_id: userId,
    url,
    title,
    tags,
    folder,
    favicon_url: faviconFor(url),
    unread,
  });
  revalidatePath("/app/bookmarks");
}

export async function updateBookmarkAction(
  id: number,
  url: string,
  title: string,
  tags: string,
  folder: string,
) {
  const cleanUrl = normalizeUrl(url);
  if (!cleanUrl) return;
  const cleanTitle = title.trim() || deriveTitle(cleanUrl);
  const { supabase, userId } = await requireUser();
  await supabase
    .from("bookmarks")
    .update({
      url: cleanUrl,
      title: cleanTitle,
      tags: parseTags(tags),
      folder: folder.trim() || null,
      favicon_url: faviconFor(cleanUrl),
    })
    .eq("id", id)
    .eq("user_id", userId);
  revalidatePath("/app/bookmarks");
}

export async function deleteBookmarkAction(id: number) {
  const { supabase, userId } = await requireUser();
  await supabase.from("bookmarks").delete().eq("id", id).eq("user_id", userId);
  revalidatePath("/app/bookmarks");
}

/** Record that a bookmark was opened (P3 "last opened" tracking). */
export async function markOpenedAction(id: number) {
  const { supabase, userId } = await requireUser();
  await supabase
    .from("bookmarks")
    .update({ last_opened_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", userId);
  revalidatePath("/app/bookmarks");
}

/** Toggle the read-it-later flag (P3). */
export async function setUnreadAction(id: number, unread: boolean) {
  const { supabase, userId } = await requireUser();
  await supabase
    .from("bookmarks")
    .update({ unread })
    .eq("id", id)
    .eq("user_id", userId);
  revalidatePath("/app/bookmarks");
}

/**
 * Bulk import (P3): one URL per line, optional title after whitespace. Returns
 * how many rows were inserted so the UI can report it. New rows are flagged
 * unread (read-it-later) since an imported list is a backlog to triage.
 */
export async function importBookmarksAction(text: string): Promise<number> {
  const entries = parseImport(text);
  if (entries.length === 0) return 0;
  const { supabase, userId } = await requireUser();
  const rows = entries.map((e) => ({
    user_id: userId,
    url: e.url,
    title: e.title,
    tags: [],
    folder: null,
    favicon_url: faviconFor(e.url),
    unread: true,
  }));
  const { error } = await supabase.from("bookmarks").insert(rows);
  if (error) throw new Error(error.message);
  revalidatePath("/app/bookmarks");
  return rows.length;
}
