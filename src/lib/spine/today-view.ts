// Pure view helpers for the Today ritual (Phase 3). No DB / no server-only, so
// they're unit-tested. Components stay declarative; all bucketing/ordering lives here.
import { type SpineToday, STATUS_ORDER } from "./types";

export type Mode = "morning" | "day" | "evening";

/** Local hour → ritual mode. Morning < 12, day 12–16, evening ≥ 17. */
export function pickMode(hour: number): Mode {
  if (hour < 12) return "morning";
  if (hour < 17) return "day";
  return "evening";
}

/** Which apps to show: pinned → recency (usage is pre-ordered), filtered to apps
 *  that have an adapter, deduped, capped. Empty usage → all registered. */
export function chooseApps(
  usage: { app_id: string; pinned: boolean }[],
  registered: string[],
  cap: number,
): string[] {
  const reg = new Set(registered);
  const seen = new Set<string>();
  const chosen: string[] = [];
  for (const u of usage) {
    if (reg.has(u.app_id) && !seen.has(u.app_id)) {
      seen.add(u.app_id);
      chosen.push(u.app_id);
      if (chosen.length >= cap) break;
    }
  }
  return chosen.length > 0 ? chosen : registered.slice(0, cap);
}

/**
 * Resolve which apps Today shows, honoring an agent/user layout override (`today_prefs`).
 * An explicit `ordered_app_ids` wins (filtered to registered + non-hidden, deduped, capped);
 * otherwise fall back to the usage-based `chooseApps` over the non-hidden registered set.
 * Null prefs ⇒ identical to `chooseApps(usage, registered, cap)` (back-compatible).
 */
export function resolveTodayApps(
  prefs: { ordered_app_ids?: string[]; hidden_app_ids?: string[] } | null,
  usage: { app_id: string; pinned: boolean }[],
  registered: string[],
  cap: number,
): string[] {
  const hidden = new Set(prefs?.hidden_app_ids ?? []);
  const visible = registered.filter((r) => !hidden.has(r));
  const ordered = prefs?.ordered_app_ids ?? [];
  if (ordered.length) {
    const reg = new Set(visible);
    const seen = new Set<string>();
    const chosen: string[] = [];
    for (const id of ordered) {
      if (reg.has(id) && !seen.has(id)) {
        seen.add(id);
        chosen.push(id);
        if (chosen.length >= cap) break;
      }
    }
    if (chosen.length) return chosen; // else fall through (degenerate order → don't blank Today)
  }
  return chooseApps(usage, visible, cap);
}

export interface TodayGroups {
  attention: SpineToday[]; // overdue | due
  upcoming: SpineToday[];
  done: SpineToday[];
}

/** Sort cards worst-first by severity, then by count desc (busiest first). */
export function sortCards(cards: SpineToday[]): SpineToday[] {
  return [...cards].sort(
    (a, b) => STATUS_ORDER[a.severity] - STATUS_ORDER[b.severity] || b.count - a.count,
  );
}

/** Bucket cards into attention / upcoming / done, each sorted. */
export function groupBySeverity(today: SpineToday[]): TodayGroups {
  const attention = sortCards(today.filter((t) => t.severity === "overdue" || t.severity === "due"));
  const upcoming = sortCards(today.filter((t) => t.severity === "upcoming"));
  const done = sortCards(today.filter((t) => t.severity === "done"));
  return { attention, upcoming, done };
}
