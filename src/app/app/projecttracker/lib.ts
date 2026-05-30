// Pure, dependency-free helpers for the project tracker — shared by the view and
// covered by unit tests so the derived-% and deadline math stay honest.

export const STATUSES = ["planning", "active", "blocked", "done"] as const;
export type Status = (typeof STATUSES)[number];

export function cleanStatus(status: string): Status {
  return (STATUSES as readonly string[]).includes(status) ? (status as Status) : "planning";
}

/** % complete derived from a project's tasks (0 when there are none). */
export function pct(tasks: { completed: boolean }[]): number {
  if (tasks.length === 0) return 0;
  const done = tasks.filter((t) => t.completed).length;
  return Math.round((done / tasks.length) * 100);
}

/**
 * Human deadline label relative to `now` (defaults to today).
 * Returns null when there is no due date.
 */
export function dueLabel(
  due: string | null,
  now: Date = new Date(),
): { text: string; overdue: boolean } | null {
  if (!due) return null;
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const d = new Date(due + "T00:00:00");
  const diff = Math.round((d.getTime() - today.getTime()) / 86_400_000);
  if (diff === 0) return { text: "Due today", overdue: false };
  if (diff > 0) return { text: `${diff} day${diff === 1 ? "" : "s"} left`, overdue: false };
  const over = -diff;
  return { text: `${over} day${over === 1 ? "" : "s"} overdue`, overdue: true };
}
