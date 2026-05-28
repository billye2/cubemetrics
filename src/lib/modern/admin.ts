/**
 * The single account allowed to review and approve feedback. Configurable via
 * the ADMIN_EMAIL env var; defaults to the project owner.
 */
export const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || "admin@example.com").toLowerCase();

export function isAdmin(email?: string | null): boolean {
  return !!email && email.toLowerCase() === ADMIN_EMAIL;
}
