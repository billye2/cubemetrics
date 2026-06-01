// The app catalog — single source of truth for the home grid.
//
// The APPS array is GENERATED from one-JSON-per-app entry files under ./apps/
// (see ./_generated.ts and scripts/build-catalog.mjs). To add or change an app,
// edit/add ./apps/<id>.json and run `npm run build:catalog` — never hand-edit
// _generated.ts. This keeps parallel build agents from colliding on a shared
// array; see docs/agent-orchestration.md.
//
// Types, CATEGORIES, and the lookup helpers live here (hand-maintained).
import { APPS } from "./_generated";

export { APPS };

export type UiType =
  | "modern"
  | "tracker"
  | "checklist"
  | "logbook"
  | "goal"
  | "finance"
  | "schedule";

export interface AppEntry {
  id: string;
  name: string;
  category: string;
  description: string;
  icon: string;
  ui: UiType;
  config?: FactoryConfig;
}

export interface FactoryConfig {
  // tracker
  trackerType?: string;
  unit?: string;
  labels?: string[];
  min?: number;
  max?: number;
  aggregate?: "sum" | "latest" | "average";
  /** Optional daily target — draws a ring on the hero + a goal line on the chart. */
  dailyGoal?: number;
  /** "at-least" (default) treats the goal as a floor; "at-most" treats it as a cap (screen time, caffeine). */
  goalDirection?: "at-least" | "at-most";
  /** One-tap increment buttons for additive (sum) trackers, e.g. water [1, 2]. */
  quickAdd?: number[];
  /** "line" draws an auto-fit line chart (weight) instead of the default 0-based bars. */
  chartStyle?: "bars" | "line";
  /** A healthy [min, max] band shaded on the chart, e.g. sleep [7, 9]. */
  idealRange?: [number, number];
  // checklist
  listType?: string;
  itemLabel?: string;
  // logbook
  logType?: string;
  entryLabel?: string;
  hasTitle?: boolean;
  // goal
  goalType?: string;
  hasTarget?: boolean;
  // finance
  itemType?: string;
  hasDueDate?: boolean;
  hasAmount?: boolean;
  // schedule
  scheduleType?: string;
}

export const CATEGORIES: { id: string; label: string }[] = [
  { id: "time", label: "Time & Focus" },
  { id: "tasks", label: "Tasks & Planning" },
  { id: "goals", label: "Goals & Progress" },
  { id: "habits", label: "Habits & Wellness" },
  { id: "notes", label: "Notes & Thinking" },
  { id: "finance", label: "Finance" },
  { id: "learning", label: "Learning & Reading" },
  { id: "org", label: "Organization" },
  { id: "work", label: "Work & Collaboration" },
  { id: "lifestyle", label: "Lifestyle" },
];

/**
 * Inline style for an app's icon chip, colored by its category. Reads the
 * `--cat-<category>` CSS var (per-category hue in light/Cedar, azure fallback in
 * dark — see globals.css) for the icon color, and a 13% tint of it for the chip
 * background, mirroring the icon-color-system spec. Keeps the icon tiles
 * theme-aware with no per-app data. Returns a plain style object for a tile.
 */
export function categoryIconStyle(categoryId: string): {
  color: string;
  backgroundColor: string;
} {
  const c = `var(--cat-${categoryId}, var(--color-cyan-500))`;
  return {
    color: c,
    backgroundColor: `color-mix(in srgb, ${c} 13%, var(--color-zinc-900))`,
  };
}

export function getApp(id: string): AppEntry | undefined {
  return APPS.find((a) => a.id === id);
}

export function getAppsByCategory(categoryId: string): AppEntry[] {
  return APPS.filter((a) => a.category === categoryId);
}
