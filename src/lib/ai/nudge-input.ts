// Pure core of the Today insight line (Phase 5). DB-free, unit-tested. Ships a
// deterministic `fallbackLine` today; the AI upgrade (behind AI_NUDGES_ENABLED)
// is a one-function swap at `getNudge` — see docs/app-plans/spine-phase5.md §4-5.
import { getApp } from "@/lib/modern/catalog";
import type { SpineToday } from "@/lib/spine/types";
import type { XpSummary } from "@/lib/xp/compute";
import type { Mode } from "@/lib/spine/today-view";

const STREAK_MIN = 3;

export interface NudgeInput {
  mode: Mode;
  streak: number;
  streakAtRisk: boolean;
  todayPoints: number;
  quests: { done: number; total: number };
  attention: number; // # cards severity overdue|due
  doneToday: number; // # cards severity done
  apps: {
    name: string;
    severity: string;
    count: number;
    summary: string;
    progress?: { current: number; target: number; unit?: string };
  }[];
  notable: boolean;
}

/** Compact, model-safe summary of the day (structural signal only — no free-text bodies). */
export function buildNudgeInput(today: SpineToday[], xp: XpSummary | null, mode: Mode): NudgeInput {
  const attention = today.filter((t) => t.severity === "overdue" || t.severity === "due").length;
  const doneToday = today.filter((t) => t.severity === "done").length;
  const streak = xp?.streak ?? 0;
  const todayPoints = xp?.todayPoints ?? 0;
  const quests = { done: xp?.questsCompletedToday ?? 0, total: xp?.todayQuests.length ?? 0 };
  const apps = today.map((t) => ({
    name: getApp(t.appId)?.name ?? t.appId,
    severity: t.severity,
    count: t.count,
    summary: t.summary,
    progress: t.progress,
  }));
  const streakAtRisk = streak >= STREAK_MIN && todayPoints === 0;
  const notable = streak > 0 || attention > 0 || doneToday > 0 || quests.done > 0;
  return { mode, streak, streakAtRisk, todayPoints, quests, attention, doneToday, apps, notable };
}

/** Stable hash of the input (for the AI cache key, when the model is wired). */
export function hashInput(input: NudgeInput): string {
  const json = JSON.stringify(input);
  let h = 5381;
  for (let i = 0; i < json.length; i++) h = (((h << 5) + h) + json.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

/** Deterministic, on-brand insight line. Empty string when nothing's notable (earned rule). */
export function fallbackLine(input: NudgeInput): string {
  if (input.streakAtRisk) return `🔥 Keep your ${input.streak}-day streak alive — log one thing.`;
  if (input.attention > 0) {
    const n = input.attention;
    return `${n} thing${n === 1 ? "" : "s"} need${n === 1 ? "s" : ""} attention today.`;
  }
  if (input.mode === "evening" && input.doneToday > 0) return `Nice — ${input.doneToday} done today.`;
  if (input.streak > 0) return `Day ${input.streak} of your streak.`;
  return "";
}

/**
 * The one insight line for the Today header / digest. Today it's deterministic.
 * To upgrade to AI: `npm i ai zod`, gate on AI_NUDGES_ENABLED + the user's
 * ai_insights_enabled pref, and replace this body with a cached generateObject()
 * over the AI Gateway ("anthropic/claude-haiku-4-5"), falling back to
 * fallbackLine() on any miss. See docs/app-plans/spine-phase5.md.
 */
export function getNudge(today: SpineToday[], xp: XpSummary | null, mode: Mode): string {
  const input = buildNudgeInput(today, xp, mode);
  if (!input.notable) return "";
  return fallbackLine(input);
}
