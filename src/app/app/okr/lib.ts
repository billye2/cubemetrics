// Pure, dependency-free helpers for the OKR app — shared by the view and covered
// by unit tests so the roll-up math, confidence handling, and cycle defaults stay
// honest.

export const CONFIDENCES = ["on_track", "at_risk", "off_track"] as const;
export type Confidence = (typeof CONFIDENCES)[number];

export function cleanConfidence(c: string): Confidence {
  return (CONFIDENCES as readonly string[]).includes(c) ? (c as Confidence) : "on_track";
}

/** % toward target for a single key result, clamped to 0–100. */
export function krPct(current: number, target: number): number {
  if (target === 0) return current > 0 ? 100 : 0;
  const raw = (current / target) * 100;
  if (!Number.isFinite(raw)) return 0;
  return Math.max(0, Math.min(100, Math.round(raw)));
}

/** Objective score = mean of its KR %s (0 when there are no KRs). */
export function objectiveScore(krs: { current_value: number; target_value: number }[]): number {
  if (krs.length === 0) return 0;
  const sum = krs.reduce((acc, kr) => acc + krPct(kr.current_value, kr.target_value), 0);
  return Math.round(sum / krs.length);
}

/**
 * Current quarter label, e.g. "Q2 2026". Used as the default cycle on new
 * objectives and to pre-select the cycle filter.
 */
export function currentCycle(now: Date = new Date()): string {
  const q = Math.floor(now.getMonth() / 3) + 1;
  return `Q${q} ${now.getFullYear()}`;
}
