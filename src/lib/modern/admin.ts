/**
 * The single account allowed to review and approve feedback. Configurable via
 * the ADMIN_EMAIL env var; defaults to the project owner.
 */
export const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || "billye@gmail.com").toLowerCase();

export function isAdmin(email?: string | null): boolean {
  return !!email && email.toLowerCase() === ADMIN_EMAIL;
}

/**
 * Catalog app ids that are system/admin tools, not productivity apps. They are
 * pulled OUT of the normal category grid and shown only inside the admins-only
 * "Administrator" section on /apps, so they don't read as empty/broken data apps.
 */
export const ADMIN_APP_IDS = new Set<string>(["notifications"]);
