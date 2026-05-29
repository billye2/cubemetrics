// Level curve for the XP layer. Pure + deterministic so it can be unit-tested
// and called from both server and client.

// Total XP required to *reach* level L. L1 = 0, L2 = 50, L3 = 200, L5 = 800…
export function xpToReach(level: number): number {
  const l = Math.max(1, Math.floor(level));
  return 50 * (l - 1) ** 2;
}

// Inverse of xpToReach: the level a given total XP puts you at.
export function levelForXp(totalXp: number): number {
  return Math.floor(Math.sqrt(Math.max(0, totalXp) / 50)) + 1;
}

const LEVEL_TITLES: { min: number; title: string }[] = [
  { min: 1, title: "Novice" },
  { min: 3, title: "Apprentice" },
  { min: 6, title: "Operator" },
  { min: 10, title: "Adept" },
  { min: 15, title: "Expert" },
  { min: 21, title: "Master" },
  { min: 30, title: "Grandmaster" },
  { min: 45, title: "Legend" },
];

export function titleForLevel(level: number): string {
  let title = LEVEL_TITLES[0].title;
  for (const band of LEVEL_TITLES) if (level >= band.min) title = band.title;
  return title;
}

export interface LevelInfo {
  level: number;
  title: string;
  totalXp: number;
  /** XP accumulated within the current level. */
  intoLevel: number;
  /** XP span of the current level. */
  levelSpan: number;
  /** XP still needed to reach the next level. */
  toNext: number;
  /** Progress through the current level, 0–100. */
  pct: number;
}

export function levelInfo(totalXp: number): LevelInfo {
  const total = Math.max(0, Math.floor(totalXp));
  const level = levelForXp(total);
  const base = xpToReach(level);
  const next = xpToReach(level + 1);
  const levelSpan = next - base;
  const intoLevel = total - base;
  return {
    level,
    title: titleForLevel(level),
    totalXp: total,
    intoLevel,
    levelSpan,
    toNext: next - total,
    pct: levelSpan > 0 ? Math.min(100, Math.round((intoLevel / levelSpan) * 100)) : 0,
  };
}
