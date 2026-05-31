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

const PATH = "/app/recipes";

export interface IngredientInput {
  qty: number | null;
  unit: string;
  item: string;
}

export interface RecipeInput {
  name: string;
  servings: number | null;
  prepMin: number | null;
  cookMin: number | null;
  tags: string; // raw comma string
  notes: string;
  ingredients: IngredientInput[];
  steps: string[];
}

function intOrNull(n: number | null): number | null {
  if (n === null || !Number.isFinite(n) || n < 0) return null;
  return Math.round(n);
}

function numOrNull(n: number | null): number | null {
  if (n === null || !Number.isFinite(n) || n < 0) return null;
  return n;
}

function cleanIngredients(list: IngredientInput[]): IngredientInput[] {
  return list
    .map((i) => ({
      qty: numOrNull(i.qty),
      unit: (i.unit ?? "").trim().slice(0, 30),
      item: (i.item ?? "").trim().slice(0, 120),
    }))
    .filter((i) => i.item.length > 0);
}

function cleanSteps(list: string[]): string[] {
  return list.map((s) => (s ?? "").trim()).filter((s) => s.length > 0).map((s) => s.slice(0, 2000));
}

/** Replace a recipe's child rows (ingredients + steps) wholesale. */
async function writeChildren(
  supabase: Awaited<ReturnType<typeof requireUser>>["supabase"],
  recipeId: number,
  ingredients: IngredientInput[],
  steps: string[],
) {
  await supabase.from("recipe_ingredients").delete().eq("recipe_id", recipeId);
  await supabase.from("recipe_steps").delete().eq("recipe_id", recipeId);

  const ing = cleanIngredients(ingredients);
  if (ing.length > 0) {
    await supabase.from("recipe_ingredients").insert(
      ing.map((i, idx) => ({
        recipe_id: recipeId,
        qty: i.qty,
        unit: i.unit,
        item: i.item,
        sort: idx,
      })),
    );
  }

  const st = cleanSteps(steps);
  if (st.length > 0) {
    await supabase.from("recipe_steps").insert(
      st.map((text, idx) => ({ recipe_id: recipeId, step_no: idx, text })),
    );
  }
}

export async function createRecipe(input: RecipeInput): Promise<number | null> {
  const name = input.name.trim();
  if (!name) return null;
  const { supabase, userId } = await requireUser();

  const { data, error } = await supabase
    .from("recipes")
    .insert({
      user_id: userId,
      name: name.slice(0, 160),
      servings: numOrNull(input.servings),
      prep_min: intOrNull(input.prepMin),
      cook_min: intOrNull(input.cookMin),
      tags: parseTags(input.tags),
      notes: input.notes.trim().slice(0, 2000) || null,
    })
    .select("id")
    .single();

  if (error || !data) return null;
  const recipeId = data.id as number;
  await writeChildren(supabase, recipeId, input.ingredients, input.steps);
  revalidatePath(PATH);
  return recipeId;
}

export async function updateRecipe(id: number, input: RecipeInput): Promise<void> {
  const name = input.name.trim();
  if (!name) return;
  const { supabase, userId } = await requireUser();

  // Verify ownership before touching children (RLS also enforces this).
  const { data: owned } = await supabase
    .from("recipes")
    .select("id")
    .eq("id", id)
    .eq("user_id", userId)
    .single();
  if (!owned) return;

  await supabase
    .from("recipes")
    .update({
      name: name.slice(0, 160),
      servings: numOrNull(input.servings),
      prep_min: intOrNull(input.prepMin),
      cook_min: intOrNull(input.cookMin),
      tags: parseTags(input.tags),
      notes: input.notes.trim().slice(0, 2000) || null,
    })
    .eq("id", id)
    .eq("user_id", userId);

  await writeChildren(supabase, id, input.ingredients, input.steps);
  revalidatePath(PATH);
}

export async function deleteRecipe(id: number): Promise<void> {
  const { supabase, userId } = await requireUser();
  // Best-effort remove the photo object before the row (CASCADE doesn't reach Storage).
  const { data: rows } = await supabase
    .from("recipes")
    .select("photo_path")
    .eq("id", id)
    .eq("user_id", userId)
    .limit(1);
  const photoPath: string | undefined = rows?.[0]?.photo_path ?? undefined;
  if (photoPath) {
    await supabase.storage.from(PHOTO_BUCKET).remove([photoPath]);
  }
  // ON DELETE CASCADE clears child rows.
  await supabase.from("recipes").delete().eq("id", id).eq("user_id", userId);
  revalidatePath(PATH);
}

/* ───────────────────────── P3 — recipe photo (Supabase Storage) ───────────────────────── */

const PHOTO_BUCKET = "recipe-photos";
const MAX_PHOTO_BYTES = 5 * 1024 * 1024; // 5 MB
const PHOTO_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

/**
 * Upload a photo to Storage and stamp recipes.photo_path with the OBJECT PATH
 * (not a URL — the page derives the public URL on read). Objects live under
 * "<user_id>/<recipe_id>-<ts>.<ext>" so the owner-scoped Storage RLS admits the
 * write. Best-effort removes the previous object so replacing doesn't orphan it.
 * Returns an error string for the client to surface, or null on success.
 */
export async function uploadRecipePhoto(id: number, formData: FormData): Promise<string | null> {
  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0) return "No file selected.";
  if (file.size > MAX_PHOTO_BYTES) return "Image is too large (max 5 MB).";
  const ext = PHOTO_TYPES[file.type];
  if (!ext) return "Unsupported image type. Use JPEG, PNG, WebP, or GIF.";

  const { supabase, userId } = await requireUser();

  // Verify ownership (RLS also enforces it).
  const { data: owned } = await supabase
    .from("recipes")
    .select("photo_path")
    .eq("id", id)
    .eq("user_id", userId)
    .single();
  if (!owned) return "Recipe not found.";

  const path = `${userId}/${id}-${Date.now()}.${ext}`;
  const { error: upErr } = await supabase.storage
    .from(PHOTO_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: true });
  if (upErr) return "Upload failed. Please try again.";

  const prev: string | undefined = owned.photo_path ?? undefined;
  if (prev && prev !== path) {
    await supabase.storage.from(PHOTO_BUCKET).remove([prev]);
  }

  await supabase
    .from("recipes")
    .update({ photo_path: path })
    .eq("id", id)
    .eq("user_id", userId);
  revalidatePath(PATH);
  return null;
}

/** Clear the photo: drop the Storage object (best-effort) and null the column. */
export async function removeRecipePhoto(id: number): Promise<void> {
  const { supabase, userId } = await requireUser();
  const { data: rows } = await supabase
    .from("recipes")
    .select("photo_path")
    .eq("id", id)
    .eq("user_id", userId)
    .limit(1);
  const path: string | undefined = rows?.[0]?.photo_path ?? undefined;
  if (path) {
    await supabase.storage.from(PHOTO_BUCKET).remove([path]);
  }
  await supabase
    .from("recipes")
    .update({ photo_path: null })
    .eq("id", id)
    .eq("user_id", userId);
  revalidatePath(PATH);
}
