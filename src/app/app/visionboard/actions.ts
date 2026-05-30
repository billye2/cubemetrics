"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabase } from "@/lib/supabase/server";
import { LIFE_AREAS, normalizeKind } from "./lib";

async function requireUser() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return { supabase, userId: user.id };
}

const PATH = "/app/visionboard";

const VALID_AREAS = new Set(LIFE_AREAS.map((a) => a.id));

function cleanSection(section: string): string | null {
  const s = section.trim();
  if (!s) return null;
  return VALID_AREAS.has(s) ? s : null;
}

/** Add a quote/affirmation card. */
export async function addQuoteCard(text: string, section: string) {
  const trimmed = text.trim();
  if (!trimmed) return;
  const { supabase, userId } = await requireUser();
  await supabase.from("vision_cards").insert({
    user_id: userId,
    kind: "quote",
    text: trimmed.slice(0, 500),
    section: cleanSection(section),
  });
  revalidatePath(PATH);
}

/** Add an image card from a URL (Storage upload lands in P2). */
export async function addImageCard(imageUrl: string, caption: string, section: string) {
  const url = imageUrl.trim();
  if (!/^https?:\/\//i.test(url)) return;
  const { supabase, userId } = await requireUser();
  await supabase.from("vision_cards").insert({
    user_id: userId,
    kind: "image",
    image_url: url.slice(0, 2000),
    text: caption.trim().slice(0, 200) || null,
    section: cleanSection(section),
  });
  revalidatePath(PATH);
}

export async function setCardSection(id: number, section: string) {
  const { supabase, userId } = await requireUser();
  await supabase
    .from("vision_cards")
    .update({ section: cleanSection(section) })
    .eq("id", id)
    .eq("user_id", userId);
  revalidatePath(PATH);
}

export async function deleteCard(id: number) {
  const { supabase, userId } = await requireUser();
  await supabase.from("vision_cards").delete().eq("id", id).eq("user_id", userId);
  revalidatePath(PATH);
}

// Exposed for completeness / future kind toggles; keeps normalizeKind referenced.
export async function setCardKind(id: number, kind: string) {
  const { supabase, userId } = await requireUser();
  await supabase
    .from("vision_cards")
    .update({ kind: normalizeKind(kind) })
    .eq("id", id)
    .eq("user_id", userId);
  revalidatePath(PATH);
}
