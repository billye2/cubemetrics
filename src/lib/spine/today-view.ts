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
