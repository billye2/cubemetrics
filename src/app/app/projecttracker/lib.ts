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

/**
 * "blocked N days" label from the timestamp a project entered the blocked
 * state. Same day reads "blocked today". Returns null when not blocked.
 */
export function blockedSince(
  blockedAt: string | null,
  now: Date = new Date(),
): string | null {
  if (!blockedAt) return null;
  const then = new Date(blockedAt);
  if (Number.isNaN(then.getTime())) return null;
  const days = Math.floor((now.getTime() - then.getTime()) / 86_400_000);
  if (days <= 0) return "blocked today";
  return `blocked ${days} day${days === 1 ? "" : "s"}`;
}

export const SORT_KEYS = ["status", "deadline", "progress", "created"] as const;
export type SortKey = (typeof SORT_KEYS)[number];

/** A project shape just rich enough for sort/filter math (testable in isolation). */
export interface SortableProject {
  status: string;
  due_date: string | null;
  created_at?: string;
  tasks: { completed: boolean }[];
}

const STATUS_ORDER: Record<string, number> = {
  planning: 0,
  active: 1,
  blocked: 2,
  done: 3,
};

export function statusOrder(status: string): number {
  return STATUS_ORDER[status] ?? 0;
}

/**
 * Filter by a single status (or "all"), then sort by the chosen key. Pure and
 * stable so the board/list views and tests agree on ordering.
 *   - status:   pipeline order (planning → done)
 *   - deadline: soonest due first; projects with no date sink to the bottom
 *   - progress: most complete first
 *   - created:  newest first (preserves the page's default order)
 */
export function sortFilter<T extends SortableProject>(
  projects: T[],
  filterStatus: string,
  sortKey: SortKey,
): T[] {
  const filtered =
    filterStatus === "all"
      ? projects
      : projects.filter((p) => p.status === filterStatus);

  const withIndex = filtered.map((p, i) => ({ p, i }));

  withIndex.sort((a, b) => {
    let cmp = 0;
    if (sortKey === "status") {
      cmp = statusOrder(a.p.status) - statusOrder(b.p.status);
    } else if (sortKey === "deadline") {
      const av = a.p.due_date ? new Date(a.p.due_date + "T00:00:00").getTime() : Infinity;
      const bv = b.p.due_date ? new Date(b.p.due_date + "T00:00:00").getTime() : Infinity;
      cmp = av - bv;
    } else if (sortKey === "progress") {
      cmp = pct(b.p.tasks) - pct(a.p.tasks);
    }
    // "created" leaves cmp at 0 → falls through to the stable original order.
    return cmp !== 0 ? cmp : a.i - b.i;
  });

  return withIndex.map((x) => x.p);
}
