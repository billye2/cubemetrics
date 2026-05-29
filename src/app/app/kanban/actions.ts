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

const PATH = "/app/kanban";
const BOARD = "default";
export const LANES = ["todo", "doing", "done"] as const;
type Lane = (typeof LANES)[number];

function cleanLane(lane: string): Lane {
  return (LANES as readonly string[]).includes(lane) ? (lane as Lane) : "todo";
}

export async function addCard(lane: string, title: string) {
  const trimmed = title.trim();
  if (!trimmed) return;
  const { supabase, userId } = await requireUser();
  await supabase.from("kanban_cards").insert({
    user_id: userId,
    board_type: BOARD,
    column_name: cleanLane(lane),
    title: trimmed.slice(0, 200),
  });
  revalidatePath(PATH);
}

export async function moveCard(id: number, lane: string) {
  const { supabase, userId } = await requireUser();
  await supabase
    .from("kanban_cards")
    .update({ column_name: cleanLane(lane) })
    .eq("id", id)
    .eq("user_id", userId);
  revalidatePath(PATH);
}

export async function deleteCard(id: number) {
  const { supabase, userId } = await requireUser();
  await supabase.from("kanban_cards").delete().eq("id", id).eq("user_id", userId);
  revalidatePath(PATH);
}
