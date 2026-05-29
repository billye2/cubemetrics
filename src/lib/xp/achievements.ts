// Achievement definitions. Each is a pure predicate over cumulative stats so
// evaluation is testable and has no DB dependency.

export interface CumulativeStats {
  totalXp: number;
  level: number;
  currentStreak: number;
  longestStreak: number;
  appsWithXp: number; // distinct sources ever contributing XP
  focusMinutes: number; // lifetime focus minutes
  todosCompleted: number; // lifetime todos completed
  activeDays: number; // days with any XP
  firstActionHour: number | null; // earliest local hour-of-day of any logged action (0–23)
  lastActionHour: number | null; // latest local hour-of-day of any logged action (0–23)
}

export interface AchievementDef {
  key: string;
  name: string;
  description: string;
  icon: string;
  test: (s: CumulativeStats) => boolean;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { key: "first_step", name: "First Step", description: "Earn your first XP", icon: "✦", test: (s) => s.totalXp > 0 },
  { key: "getting_going", name: "Getting Going", description: "Reach level 3", icon: "▲", test: (s) => s.level >= 3 },
  { key: "week_warrior", name: "Week Warrior", description: "Hit a 7-day streak", icon: "🔥", test: (s) => s.longestStreak >= 7 },
  { key: "unstoppable", name: "Unstoppable", description: "Hit a 30-day streak", icon: "⚡", test: (s) => s.longestStreak >= 30 },
  { key: "deep_worker", name: "Deep Worker", description: "Log 50 hours of focus", icon: "◉", test: (s) => s.focusMinutes >= 50 * 60 },
  { key: "task_master", name: "Task Master", description: "Complete 1,000 todos", icon: "✓", test: (s) => s.todosCompleted >= 1000 },
  { key: "centurion", name: "Centurion", description: "Reach level 10", icon: "★", test: (s) => s.level >= 10 },
  { key: "polymath", name: "Polymath", description: "Earn XP from 10 different apps", icon: "◈", test: (s) => s.appsWithXp >= 10 },
  { key: "committed", name: "Committed", description: "Be active for 100 days", icon: "◆", test: (s) => s.activeDays >= 100 },
  { key: "early_bird", name: "Early Bird", description: "Log activity before 7 AM", icon: "🌅", test: (s) => s.firstActionHour != null && s.firstActionHour < 7 },
  { key: "night_owl", name: "Night Owl", description: "Log activity after 11 PM", icon: "🌙", test: (s) => s.lastActionHour != null && s.lastActionHour >= 23 },
];

/** Keys of every achievement currently satisfied by the stats. */
export function satisfiedAchievements(stats: CumulativeStats): string[] {
  return ACHIEVEMENTS.filter((a) => a.test(stats)).map((a) => a.key);
}
