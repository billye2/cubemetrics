"use server";
import { createServerSupabase } from "@/lib/supabase/server";
import { isThemePref, type ThemePref } from "@/lib/theme";

/** Persist the theme preference to the user's profile (cross-device sync).
 *  No-op when signed out or given a bad value. The client also caches it in
 *  localStorage for instant, flash-free application. */
export async function setTheme(pref: ThemePref): Promise<{ ok: boolean }> {
  if (!isThemePref(pref)) return { ok: false };
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false };
  const { error } = await supabase.from("profiles").update({ theme: pref }).eq("id", user.id);
  return { ok: !error };
}
