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

// --- P3: account level, practice streak, weekly XP, rust ---------------------
// All pure so they unit-test in isolation and run identically on server + client.

/** Format a Date as a local `YYYY-MM-DD` calendar day (no timezone shift). */
export function dayKeyLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** The calendar day (`YYYY-MM-DD`) an ISO timestamp falls on, in local time. */
export function isoToDay(iso: string): string {
  return dayKeyLocal(new Date(iso));
}

/**
 * Account level across every skill: the sum of all skills' levels, surfaced as a
 * single "account level" headline. Maxed skills contribute MAX_LEVEL. This is the
 * cheap, legible aggregate (vs. summing raw XP, which a few grinds would dominate).
 */
export function accountLevel(xps: number[]): number {
  return xps.reduce((acc, xp) => acc + levelFromXp(xp).level, 0);
}

/**
 * Consecutive-day practice streak ending today, with a one-day grace so an
 * in-progress today doesn't read as a break (matches Habits/Focus). `days` is the
 * set of local calendar days on which *any* skill was practiced.
 */
export function practiceStreak(days: Set<string>, now: Date = new Date()): number {
  let cursor = new Date(now);
  if (!days.has(dayKeyLocal(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
    if (!days.has(dayKeyLocal(cursor))) return 0;
  }
  let streak = 0;
  while (days.has(dayKeyLocal(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export interface WeekBucket {
  /** ISO `YYYY-MM-DD` of the bucket's Monday (week start). */
  weekStart: string;
  /** Total XP logged in that week. */
  xp: number;
}

/** Monday (week start) for a given day, as a local Date at midnight. */
function weekStartOf(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dow = (x.getDay() + 6) % 7; // Mon=0 .. Sun=6
  x.setDate(x.getDate() - dow);
  return x;
}

/**
 * Bucket practice XP into the trailing `weeks` calendar weeks (Mon–Sun) ending in
 * the week that contains `now`. Oldest week first; empty weeks are kept (xp 0) so
 * the chart has a stable width.
 */
export function weeklyXp(
  entries: { xp: number; created_at: string }[],
  weeks = 8,
  now: Date = new Date(),
): WeekBucket[] {
  const thisWeek = weekStartOf(now);
  const buckets: WeekBucket[] = [];
  const indexByKey = new Map<string, number>();
  for (let i = weeks - 1; i >= 0; i--) {
    const ws = new Date(thisWeek);
    ws.setDate(ws.getDate() - i * 7);
    const key = dayKeyLocal(ws);
    indexByKey.set(key, buckets.length);
    buckets.push({ weekStart: key, xp: 0 });
  }
  for (const e of entries) {
    const ws = dayKeyLocal(weekStartOf(new Date(e.created_at)));
    const idx = indexByKey.get(ws);
    if (idx != null) buckets[idx].xp += Math.max(0, Math.floor(e.xp) || 0);
  }
  return buckets;
}

export const RUST_AFTER_DAYS = 14; // grace before a skill starts to rust

export interface RustInfo {
  /** Whole days since the last practice (null = never practiced). */
  idleDays: number | null;
  /** True once idle beyond the grace window. */
  rusting: boolean;
}

/**
 * "Rust": how stale a skill is. Non-destructive — we never mutate stored XP; this
 * is a display hint that a skill has gone untouched. `lastPracticedAt` is the ISO
 * timestamp of the most recent practice (or null).
 */
export function rustInfo(lastPracticedAt: string | null, now: Date = new Date()): RustInfo {
  if (!lastPracticedAt) return { idleDays: null, rusting: false };
  const last = new Date(lastPracticedAt).getTime();
  const idleDays = Math.max(0, Math.floor((now.getTime() - last) / 86_400_000));
  return { idleDays, rusting: idleDays >= RUST_AFTER_DAYS };
}
