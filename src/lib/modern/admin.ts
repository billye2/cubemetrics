/**
 * Whether `email` belongs to an admin. The allowlist lives in the `app_admins`
 * table in Supabase (RLS-locked to the service role) — NOT in source (so no
 * personal email is baked into this public repo) and NOT in `profiles.role`
 * (which users can self-edit). See migration `*_app_admins.sql`.
 *
 * Fail-closed: an empty email, no matching row, or any query error all return
 * false — an unconfigured environment grants admin to no one.
 */
export async function isAdmin(email?: string | null): Promise<boolean> {
  if (!email) return false;
  try {
    const { createAdminSupabase } = await import("@/lib/supabase/admin");
    const { data, error } = await createAdminSupabase()
      .from("app_admins")
      .select("email")
      .eq("email", email.toLowerCase())
      .maybeSingle();
    return !error && !!data;
  } catch {
    return false;
  }
}

/**
 * Catalog app ids that are system/admin tools, not productivity apps. They are
 * pulled OUT of the normal category grid and shown only inside the admins-only
 * "Administrator" section on /apps, so they don't read as empty/broken data apps.
 */
export const ADMIN_APP_IDS = new Set<string>(["notifications"]);
