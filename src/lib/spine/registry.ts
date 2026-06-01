import "server-only";
import { ADAPTERS } from "./_generated";
import type { SpineCtx, SpineToday } from "./types";

/** Every registered adapter's appId — the default app set for getToday(). */
export const REGISTERED_APP_IDS = ADAPTERS.map((a) => a.appId);

/** Fan out today() across the given apps (default: all registered). Mirrors
 *  ensureXp's Promise.all — one bad adapter never sinks the page. */
export async function getToday(ctx: SpineCtx, appIds?: string[]): Promise<SpineToday[]> {
  const chosen = appIds ? ADAPTERS.filter((a) => appIds.includes(a.appId)) : ADAPTERS;
  const results = await Promise.all(chosen.map((a) => a.today(ctx).catch(() => null)));
  return results.filter((r): r is SpineToday => r != null);
}
