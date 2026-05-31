import type { SpineToday } from "@/lib/spine/types";
import type { XpSummary } from "@/lib/xp/compute";
import type { Kind } from "./types";

// THE TRUST RULE: notifications must be earned. Nothing actionable ⇒ send nothing.
export const STREAK_MIN = 3;

/** A streak worth protecting that hasn't been fed today. */
export function streakAtRisk(xp: XpSummary | null): boolean {
  return !!xp && xp.streak >= STREAK_MIN && xp.todayPoints === 0;
}

/** Earned-only gate. Returns false ⇒ send nothing for this kind. */
export function shouldSend(kind: Kind, today: SpineToday[], xp: XpSummary | null): boolean {
  const actionable = today.filter((t) => t.severity === "overdue" || t.severity === "due");
  if (kind === "streak_save") return streakAtRisk(xp);
  if (actionable.length > 0) return true;
  if (kind === "evening" && streakAtRisk(xp)) return true; // evening doubles as streak-save in v1
  return false; // morning with nothing actionable ⇒ skip
}
