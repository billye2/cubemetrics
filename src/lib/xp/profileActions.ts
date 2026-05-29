"use server";

import { createServerSupabase } from "@/lib/supabase/server";
import { isValidIanaZone } from "./tz";

/**
 * Persist the browser's IANA timezone to the user's profile so the XP layer can
 * compute day boundaries in their local day. Validated server-side — never trust
 * the client. Fire-and-forget from TimezoneSync; only called when the value changes.
 */
export async function setTimezoneAction(tz: string) {
  if (!isValidIanaZone(tz)) return;
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("profiles").update({ timezone: tz }).eq("id", user.id);
}
