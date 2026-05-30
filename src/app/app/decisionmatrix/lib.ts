// Pure, dependency-free helpers for the Decisions app — the weighted-matrix
// math lives here and is covered by unit tests so the recommendation stays
// honest. The view and server actions both lean on these.

export const STATUSES = ["open", "decided", "revisit"] as const;
export type Status = (typeof STATUSES)[number];

export function cleanStatus(s: string): Status {
  return (STATUSES as readonly string[]).includes(s) ? (s as Status) : "open";
}

/** Criterion weight: an integer 1–5 (importance). Defaults to 3. */
export function cleanWeight(value: unknown): number {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) return 3;
  return Math.max(1, Math.min(5, n));
}

/** Raw score for an option × criterion cell: an integer 1–10. Defaults to 5. */
export function cleanScore(value: unknown): number {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) return 5;
  return Math.max(1, Math.min(10, n));
}

export interface Criterion {
  id: number;
  label: string;
  weight: number;
}

export interface OptionRow {
  id: number;
  label: string;
}

/** A score lookup keyed by `optionId:criterionId`. */
export type ScoreMap = Record<string, number>;

export function scoreKey(optionId: number, criterionId: number): string {
  return `${optionId}:${criterionId}`;
}

export interface OptionResult {
  optionId: number;
  /** Raw weighted total = Σ(score × weight) over scored criteria. */
  weighted: number;
  /** Maximum possible weighted total (all cells at 10). */
  max: number;
  /** weighted / max as a 0–100 percentage (0 when nothing to score). */
  pct: number;
}

/**
 * Compute each option's weighted score. A missing cell counts as the neutral
 * midpoint (5) so a half-filled grid still yields a sensible ranking rather
 * than punishing un-scored options to zero.
 */
export function computeResults(
  options: OptionRow[],
  criteria: Criterion[],
  scores: ScoreMap,
): OptionResult[] {
  const totalWeight = criteria.reduce((acc, c) => acc + c.weight, 0);
  const max = totalWeight * 10;
  return options.map((o) => {
    let weighted = 0;
    for (const c of criteria) {
      const raw = scores[scoreKey(o.id, c.id)] ?? 5;
      weighted += raw * c.weight;
    }
    const pct = max === 0 ? 0 : Math.round((weighted / max) * 100);
    return { optionId: o.id, weighted, max, pct };
  });
}

/**
 * The recommended winner: the option id with the highest weighted total.
 * Null on a tie or when there's nothing to compare (no options/criteria),
 * so the UI never claims a false "winner".
 */
export function recommendedOptionId(results: OptionResult[]): number | null {
  if (results.length === 0) return null;
  let best = results[0];
  let tie = false;
  for (let i = 1; i < results.length; i++) {
    const r = results[i];
    if (r.weighted > best.weighted) {
      best = r;
      tie = false;
    } else if (r.weighted === best.weighted) {
      tie = true;
    }
  }
  if (tie) return null;
  if (best.max === 0) return null;
  return best.optionId;
}

/** YYYY-MM-DD for a date input default (local time). */
export function isoDate(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** True when a revisit date is set and on/before today (a nudge is due). */
export function revisitDue(revisitAt: string | null, today: string = isoDate()): boolean {
  if (!revisitAt) return false;
  return revisitAt <= today;
}
