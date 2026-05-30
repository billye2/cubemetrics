// Pure leveling + dependency math for the Skill Tree app. No React / no I/O here
// so it can be unit-tested in isolation and reused by both the page (server) and
// the view (client).

export const XP_BASE = 100; // XP to go from level 1 -> 2
export const MAX_LEVEL = 10;

/**
 * Cumulative XP required to *reach* a given level (level 1 = 0 XP).
 * The per-level cost grows ~n^1.5, so each level is meaningfully harder than the
 * last. Cumulative so we can map a raw XP total straight to a level.
 */
export function xpForLevel(level: number): number {
  if (level <= 1) return 0;
  let total = 0;
  for (let n = 1; n < level; n++) {
    total += Math.round(XP_BASE * Math.pow(n, 1.5));
  }
  return total;
}

export interface LevelInfo {
  level: number; // current level (1..MAX_LEVEL)
  xp: number; // total accumulated XP
  maxed: boolean; // at MAX_LEVEL
  intoLevel: number; // XP earned into the current level
  span: number; // XP needed to span the current level (0 if maxed)
  toNext: number; // XP remaining to next level (0 if maxed)
  progress: number; // 0..1 fraction toward next level (1 if maxed)
}

/** Derive level + progress from a raw XP total. */
export function levelFromXp(xp: number): LevelInfo {
  const safeXp = Math.max(0, Math.floor(xp || 0));
  let level = 1;
  while (level < MAX_LEVEL && safeXp >= xpForLevel(level + 1)) {
    level++;
  }
  const maxed = level >= MAX_LEVEL;
  const floor = xpForLevel(level);
  const ceil = maxed ? floor : xpForLevel(level + 1);
  const span = maxed ? 0 : ceil - floor;
  const intoLevel = safeXp - floor;
  const toNext = maxed ? 0 : ceil - safeXp;
  const progress = maxed ? 1 : span === 0 ? 0 : intoLevel / span;
  return { level, xp: safeXp, maxed, intoLevel, span, toNext, progress };
}

export interface DepEdge {
  requires_skill_id: number;
  min_level: number;
}

/**
 * A skill is locked when any of its prerequisite skills has not yet reached the
 * required minimum level. Returns the list of unmet requirements (empty = unlocked).
 */
export function unmetRequirements(
  deps: DepEdge[],
  levelBySkill: Record<number, number>,
): DepEdge[] {
  return deps.filter((d) => (levelBySkill[d.requires_skill_id] ?? 1) < d.min_level);
}

export function isLocked(deps: DepEdge[], levelBySkill: Record<number, number>): boolean {
  return unmetRequirements(deps, levelBySkill).length > 0;
}

export interface TierNode {
  id: number;
  depth: number;
}

/**
 * Assign each skill a tier (depth) = longest dependency chain ending at it, so a
 * skill always sits below everything it requires. Cycles are broken by capping
 * the recursion; an unresolved node falls back to depth 0.
 */
export function computeTiers(
  skillIds: number[],
  depsBySkill: Record<number, DepEdge[]>,
): Record<number, number> {
  const depth: Record<number, number> = {};
  const visiting = new Set<number>();

  function resolve(id: number): number {
    if (depth[id] !== undefined) return depth[id];
    if (visiting.has(id)) return 0; // cycle guard
    visiting.add(id);
    const deps = depsBySkill[id] ?? [];
    let d = 0;
    for (const dep of deps) {
      if (skillIds.includes(dep.requires_skill_id)) {
        d = Math.max(d, resolve(dep.requires_skill_id) + 1);
      }
    }
    visiting.delete(id);
    depth[id] = d;
    return d;
  }

  for (const id of skillIds) resolve(id);
  return depth;
}
