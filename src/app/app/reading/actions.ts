"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabase } from "@/lib/supabase/server";

type BookStatus = "to_read" | "reading" | "completed" | "dropped";

const ALLOWED_STATUSES = new Set<BookStatus>([
  "to_read",
  "reading",
  "completed",
  "dropped",
]);

async function requireUser() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return { supabase, userId: user.id };
}

export async function addBookAction(title: string, author: string) {
  const t = title.trim();
  const a = author.trim();
  if (!t) return;
  const { supabase, userId } = await requireUser();
  await supabase.from("reading_list").insert({
    user_id: userId,
    title: t,
    author: a,
  });
  revalidatePath("/app/reading");
}

export async function updateStatusAction(id: number, status: string) {
  if (!ALLOWED_STATUSES.has(status as BookStatus)) return;
  const { supabase, userId } = await requireUser();
  const updates: Record<string, unknown> = { status };
  const today = new Date().toISOString().split("T")[0];
  if (status === "reading") updates.started_at = today;
  if (status === "completed") updates.finished_at = today;
  await supabase
    .from("reading_list")
    .update(updates)
    .eq("id", id)
    .eq("user_id", userId);
  revalidatePath("/app/reading");
}

export async function rateBookAction(id: number, rating: number) {
  const r = Math.max(0, Math.min(5, Math.round(rating)));
  const { supabase, userId } = await requireUser();
  await supabase
    .from("reading_list")
    .update({ rating: r === 0 ? null : r })
    .eq("id", id)
    .eq("user_id", userId);
  revalidatePath("/app/reading");
}

export async function deleteBookAction(id: number) {
  const { supabase, userId } = await requireUser();
  await supabase
    .from("reading_list")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);
  revalidatePath("/app/reading");
}

export async function updateNotesAction(id: number, notes: string) {
  const { supabase, userId } = await requireUser();
  await supabase
    .from("reading_list")
    .update({ notes })
    .eq("id", id)
    .eq("user_id", userId);
  revalidatePath("/app/reading");
}
