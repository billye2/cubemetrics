"use server";
import { revalidatePath } from "next/cache";
import { createServerSupabase } from "@/lib/supabase/server";

/**
 * Favorites = the `app_usage.pinned` flag (the column already exists from Spine
 * Layer 1). Starring an app on the grid sets pinned; the Favorites tab lists the
 * pinned apps. Toggle is idempotent: upsert the (user, app) row, then flip.
 * Returns the new pinned state so the client can reflect it optimistically.
 */
export async function toggleFavorite(appId: string): Promise<{ ok: boolean; pinned: boolean }> {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, pinned: false };

  const { data: existing } = await supabase
    .from("app_usage")
    .select("pinned")
    .eq("user_id", user.id)
    .eq("app_id", appId)
    .maybeSingle();

  const next = !(existing?.pinned ?? false);

  // Upsert the row so a never-opened app can still be starred (PK = user+app).
  const { error } = await supabase
    .from("app_usage")
    .upsert(
      { user_id: user.id, app_id: appId, pinned: next },
      { onConflict: "user_id,app_id" },
    );
  if (error) return { ok: false, pinned: existing?.pinned ?? false };

  revalidatePath("/favorites");
  revalidatePath("/apps");
  return { ok: true, pinned: next };
}

/** The set of app ids the signed-in user has starred. Empty when signed out. */
export async function getFavoriteIds(): Promise<string[]> {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await supabase
    .from("app_usage")
    .select("app_id")
    .eq("user_id", user.id)
    .eq("pinned", true);
  return (data ?? []).map((r) => r.app_id as string);
}
