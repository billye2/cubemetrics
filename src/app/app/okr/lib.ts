// Pure, dependency-free helpers for the OKR app — shared by the view and covered
// by unit tests so the roll-up math, confidence handling, and cycle defaults stay
// honest.

export const CONFIDENCES = ["on_track", "at_risk", "off_track"] as const;
export type Confidence = (typeof CONFIDENCES)[number];

export function cleanConfidence(c: string): Confidence {
  return (CONFIDENCES as readonly string[]).includes(c) ? (c as Confidence) : "on_track";
}

// --- Key-result types -------------------------------------------------------
// metric    — plain number → number (start is 0)
// milestone — done / not done (current 0|1, target 1)
// baseline  — start → target, so % is measured from the start, not from 0
export const KR_TYPES = ["metric", "milestone", "baseline"] as const;
export type KrType = (typeof KR_TYPES)[number];

export function cleanKrType(t: string): KrType {
  return (KR_TYPES as readonly string[]).includes(t) ? (t as KrType) : "metric";
}

export const KR_TYPE_LABEL: Record<KrType, string> = {
  metric: "Metric",
  milestone: "Milestone",
  baseline: "Baseline",
};

interface KrShape {
  kr_type?: string;
  start_value?: number;
  current_value: number;
  target_value: number;
}

/**
 * % toward target for a single key result, clamped to 0–100, type-aware:
 *  - milestone: 100 if current ≥ target (treat target≤0 as 1), else 0.
 *  - baseline:  progress measured from `start` → `target`.
 *  - metric:    progress from 0 → `target` (start ignored / 0).
 */
export function krPct(
  current: number,
  target: number,
  type: KrType = "metric",
  start = 0,
): number {
  if (type === "milestone") {
    const goal = target > 0 ? target : 1;
    return current >= goal ? 100 : 0;
  }

  const from = type === "baseline" ? start : 0;
  const span = target - from;
  // Degenerate span (e.g. metric target 0): treat any progress past the
  // start/zero point as fully met, matching the original metric semantics.
  if (span === 0) return current > from ? 100 : 0;
  const raw = ((current - from) / span) * 100;
  if (!Number.isFinite(raw)) return 0;
  return Math.max(0, Math.min(100, Math.round(raw)));
}

/** % for a KR row object (convenience over the positional `krPct`). */
export function krRowPct(kr: KrShape): number {
  return krPct(
    kr.current_value,
    kr.target_value,
    cleanKrType(kr.kr_type ?? "metric"),
    Number(kr.start_value) || 0,
  );
}

/** Objective score = mean of its KR %s (0 when there are no KRs). */
export function objectiveScore(krs: KrShape[]): number {
  if (krs.length === 0) return 0;
  const sum = krs.reduce((acc, kr) => acc + krRowPct(kr), 0);
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

/**
 * The cycle after `cycle` (e.g. "Q2 2026" → "Q3 2026", "Q4 2026" → "Q1 2027").
 * Falls back to the current cycle when the label isn't a recognizable "Qn YYYY".
 */
export function nextCycle(cycle: string, now: Date = new Date()): string {
  const m = /^Q([1-4])\s+(\d{4})$/.exec(cycle.trim());
  if (!m) return currentCycle(now);
  let q = Number(m[1]);
  let year = Number(m[2]);
  q += 1;
  if (q > 4) {
    q = 1;
    year += 1;
  }
  return `Q${q} ${year}`;
}

export interface CycleStats {
  count: number;
  attainment: number; // mean objective score across the cycle, 0–100
  onTrack: number;
  atRisk: number;
  offTrack: number;
}

/** Roll a cycle's objectives up into dashboard numbers. */
export function cycleStats(
  objectives: { confidence: Confidence; key_results: KrShape[] }[],
): CycleStats {
  const count = objectives.length;
  if (count === 0) {
    return { count: 0, attainment: 0, onTrack: 0, atRisk: 0, offTrack: 0 };
  }
  let scoreSum = 0;
  let onTrack = 0;
  let atRisk = 0;
  let offTrack = 0;
  for (const o of objectives) {
    scoreSum += objectiveScore(o.key_results);
    if (o.confidence === "on_track") onTrack += 1;
    else if (o.confidence === "at_risk") atRisk += 1;
    else offTrack += 1;
  }
  return {
    count,
    attainment: Math.round(scoreSum / count),
    onTrack,
    atRisk,
    offTrack,
  };
}
