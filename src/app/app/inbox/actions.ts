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

export async function captureItem(text: string) {
  const trimmed = text.trim();
  if (!trimmed) return;
  const { supabase, userId } = await requireUser();
  await supabase
    .from("inbox_items")
    .insert({ user_id: userId, text: trimmed.slice(0, 2000) });
  revalidatePath("/app/inbox");
}

/** Read an item's text, scoped to the owner. Returns null if it's gone. */
async function takeItem(
  supabase: Awaited<ReturnType<typeof createServerSupabase>>,
  userId: string,
  id: number,
): Promise<string | null> {
  const { data } = await supabase
    .from("inbox_items")
    .select("text")
    .eq("id", id)
    .eq("user_id", userId)
    .single();
  return data ? (data.text as string) : null;
}

async function consume(
  supabase: Awaited<ReturnType<typeof createServerSupabase>>,
  userId: string,
  id: number,
) {
  await supabase.from("inbox_items").delete().eq("id", id).eq("user_id", userId);
}

export async function triageToTodo(id: number) {
  const { supabase, userId } = await requireUser();
  const text = await takeItem(supabase, userId, id);
  if (text === null) return;
  await supabase.from("todos").insert({ user_id: userId, title: text.slice(0, 200) });
  await consume(supabase, userId, id);
  revalidatePath("/app/inbox");
}

export async function triageToNote(id: number) {
  const { supabase, userId } = await requireUser();
  const text = await takeItem(supabase, userId, id);
  if (text === null) return;
  // First line becomes the title, the whole capture the body.
  const title = text.split("\n")[0].slice(0, 120);
  await supabase.from("notes").insert({ user_id: userId, title, body: text });
  await consume(supabase, userId, id);
  revalidatePath("/app/inbox");
}

export async function triageToBacklog(id: number) {
  const { supabase, userId } = await requireUser();
  const text = await takeItem(supabase, userId, id);
  if (text === null) return;
  await supabase.from("checklists").insert({
    user_id: userId,
    list_type: "backlog",
    title: text.slice(0, 200),
    note: null,
  });
  await consume(supabase, userId, id);
  revalidatePath("/app/inbox");
}

export async function dismissItem(id: number) {
  const { supabase, userId } = await requireUser();
  await consume(supabase, userId, id);
  revalidatePath("/app/inbox");
}
