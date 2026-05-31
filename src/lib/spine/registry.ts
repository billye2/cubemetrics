import "server-only";
import { getApp } from "@/lib/modern/catalog";
import { ADAPTERS } from "./_generated";
import { rankCandidates } from "./lib";
import type { SpineCtx, SpineToday, QuickLogResult, LoggableApp } from "./types";

/** Every registered adapter's appId — the default app set for getToday(). */
export const REGISTERED_APP_IDS = ADAPTERS.map((a) => a.appId);

const LOGGABLE = ADAPTERS.filter((a) => a.quickLog && a.match);

/** Loggable apps (have quickLog), with display name+icon from the catalog. */
export function loggableApps(): LoggableApp[] {
  return LOGGABLE.map((a) => ({
    appId: a.appId,
    name: getApp(a.appId)?.name ?? a.appId,
    icon: getApp(a.appId)?.icon ?? "•",
  }));
}

/** Ranked capture candidates for an input — pure ranking over each adapter's match(). */
export function classify(input: string): { appId: string; score: number }[] {
  return rankCandidates(input, LOGGABLE.map((a) => ({ appId: a.appId, match: a.match! })));
}

/** Fan out today() across the given apps (default: all registered). Mirrors
 *  ensureXp's Promise.all — one bad adapter never sinks the page. */
export async function getToday(ctx: SpineCtx, appIds?: string[]): Promise<SpineToday[]> {
  const chosen = appIds ? ADAPTERS.filter((a) => appIds.includes(a.appId)) : ADAPTERS;
  const results = await Promise.all(chosen.map((a) => a.today(ctx).catch(() => null)));
  return results.filter((r): r is SpineToday => r != null);
}

/** Route a capture string to the highest-confidence loggable adapter. */
export async function route(ctx: SpineCtx, input: string): Promise<QuickLogResult | null> {
  const ranked = classify(input);
  if (!ranked.length) return null;
  const adapter = ADAPTERS.find((a) => a.appId === ranked[0].appId);
  return adapter?.quickLog ? adapter.quickLog(ctx, input) : null;
}
