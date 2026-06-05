// Pure, DB-free helpers for the spine. All branchy logic lives here (like
// xp/rules.ts::scoreDay) so adapters stay thin and the logic is unit-tested.
import { addDays } from "@/lib/xp/tz";
import { type TodayItem, type TodayStatus, type SpineToday, STATUS_ORDER, ITEM_CAP } from "./types";

// ── Today shaping ───────────────────────────────────────────────────────────

/** A due value (date or datetime) → status relative to the local `today` (YYYY-MM-DD). */
export function bucketStatus(due: string | null | undefined, today: string): TodayStatus {
  if (!due) return "upcoming";
  const d = due.slice(0, 10);
  if (d < today) return "overdue";
  if (d === today) return "due";
  return "upcoming";
}

/** Worst (most urgent) status across items; [] → "done". */
export function worstStatus(items: TodayItem[]): TodayStatus {
  if (items.length === 0) return "done";
  let worst: TodayStatus = "done";
  for (const it of items) if (STATUS_ORDER[it.status] < STATUS_ORDER[worst]) worst = it.status;
  return worst;
}

/** Sort worst-first (STATUS_ORDER, then soonest due), then cap at ITEM_CAP. */
export function sortItems(items: TodayItem[]): TodayItem[] {
  return [...items]
    .sort((a, b) => {
      const s = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
      if (s !== 0) return s;
      if (a.due && b.due) return a.due.localeCompare(b.due);
      return a.due ? -1 : b.due ? 1 : 0;
    })
    .slice(0, ITEM_CAP);
}

/** Assemble a card from items: sorts+caps items, derives severity (unless overridden). */
function card(
  appId: string,
  rawItems: TodayItem[],
  count: number,
  summary: string,
  extra?: { progress?: SpineToday["progress"]; severity?: TodayStatus },
): SpineToday {
  const items = sortItems(rawItems);
  return {
    appId,
    severity: extra?.severity ?? worstStatus(items),
    count,
    summary,
    items,
    progress: extra?.progress,
    href: `/app/${appId}`,
  };
}

const money = (n: number) => Math.round(n).toLocaleString("en-US");

// ── Per-app builders (pure; adapters do the query then call these) ──────────

export function todoToday(rows: { id: number; title: string; due_date: string | null }[], today: string): SpineToday {
  const items: TodayItem[] = rows.map((r) => ({
    id: `todo:${r.id}`,
    label: r.title,
    status: bucketStatus(r.due_date, today),
    due: r.due_date ?? undefined,
    href: "/app/todo",
  }));
  const overdue = items.filter((i) => i.status === "overdue").length;
  return card("todo", items, rows.length, `${rows.length} open${overdue ? ` · ${overdue} overdue` : ""}`);
}

export function habitsToday(
  habits: { id: number; name: string }[],
  checkedIds: Set<number>,
  _today: string,
): SpineToday {
  const remaining = habits.filter((h) => !checkedIds.has(h.id));
  const done = habits.length - remaining.length;
  const items: TodayItem[] = remaining.map((h) => ({
    id: `habit:${h.id}`,
    label: h.name,
    status: "due" as TodayStatus,
    href: "/app/habits",
  }));
  return card("habits", items, remaining.length, `${done}/${habits.length} done`, {
    progress: { current: done, target: habits.length },
  });
}

export function sumToday(rows: { value: number | null }[], goal: number): SpineToday {
  const total = rows.reduce((acc, r) => acc + (Number(r.value) || 0), 0);
  const status: TodayStatus = total >= goal ? "done" : "due";
  const items: TodayItem[] = [{ id: "water:today", label: `${total}/${goal} glasses`, status, href: "/app/water" }];
  return card("water", items, total, `${total}/${goal} glasses`, {
    progress: { current: total, target: goal, unit: "glasses" },
    severity: status,
  });
}

export function billsToday(
  rows: { id: number; name: string; amount: number; due_date: string | null }[],
  today: string,
  soon: string,
): SpineToday {
  const kept = rows.filter((r) => r.due_date != null && r.due_date.slice(0, 10) <= soon);
  const items: TodayItem[] = kept.map((r) => ({
    id: `bill:${r.id}`,
    label: `${r.name} — $${money(Number(r.amount) || 0)}`,
    status: bucketStatus(r.due_date, today),
    due: r.due_date ?? undefined,
    href: "/app/bills",
  }));
  return card("bills", items, kept.length, `${kept.length} due soon`);
}

/**
 * Schedule/recurring builder (schedule_items): next_due = last_done + interval_days;
 * a never-done item (last_done = null) is due now. Surfaces items due/overdue or within
 * the `soon` horizon; far-future items are dropped. Generic over any schedule_items app
 * (medication, carcare, …). Mirrors the app's own ScheduleView due computation.
 */
export function scheduleToday(
  appId: string,
  rows: { id: number; title: string; interval_days: number; last_done: string | null }[],
  today: string,
  soon: string,
): SpineToday {
  const items: TodayItem[] = [];
  for (const r of rows) {
    const nextDue = r.last_done ? addDays(r.last_done.slice(0, 10), r.interval_days) : null;
    if (nextDue && nextDue > soon) continue; // not relevant yet — don't nag
    items.push({
      id: `${appId}:${r.id}`,
      label: r.title,
      status: nextDue ? bucketStatus(nextDue, today) : "due", // null = never done = due now
      due: nextDue ?? undefined,
      href: `/app/${appId}`,
    });
  }
  const overdue = items.filter((i) => i.status === "overdue").length;
  const due = items.filter((i) => i.status === "due").length;
  const summary =
    [overdue ? `${overdue} overdue` : "", due ? `${due} due` : ""].filter(Boolean).join(" · ") ||
    `${items.length} upcoming`;
  return card(appId, items, items.length, summary);
}

/**
 * Goals builder: surfaces active (not completed) goals as a list, severity by deadline
 * (a reached target counts as done; no deadline = upcoming). Card-level progress is the
 * average % across goals that have a target — mirrors GoalView's "Avg progress" stat.
 */
export function goalsToday(
  rows: {
    id: number;
    title: string;
    target_value: number | null;
    current_value: number | null;
    due_date: string | null;
    status: string;
  }[],
  today: string,
): SpineToday | null {
  const active = rows.filter((g) => g.status !== "completed");
  if (active.length === 0) return null;
  const items: TodayItem[] = active.map((g) => {
    const target = g.target_value ?? 0;
    const reached = target > 0 && (g.current_value ?? 0) >= target;
    return {
      id: `goal:${g.id}`,
      label: g.title,
      status: reached ? "done" : bucketStatus(g.due_date, today),
      due: g.due_date ?? undefined,
      href: "/app/goals",
    };
  });
  const withTarget = active.filter((g) => (g.target_value ?? 0) > 0);
  const avgPct = withTarget.length
    ? Math.round(
        withTarget.reduce(
          (acc, g) => acc + Math.min(100, ((g.current_value ?? 0) / (g.target_value ?? 1)) * 100),
          0,
        ) / withTarget.length,
      )
    : null;
  const overdue = items.filter((i) => i.status === "overdue").length;
  const summary =
    `${active.length} active` +
    (overdue ? ` · ${overdue} overdue` : avgPct !== null ? ` · ${avgPct}% avg` : "");
  return card("goals", items, active.length, summary, {
    progress: avgPct !== null ? { current: avgPct, target: 100, unit: "%" } : undefined,
  });
}

export function budgetToday(planned: number, spent: number): SpineToday {
  const pct = planned > 0 ? spent / planned : null;
  const severity: TodayStatus = pct != null && pct > 1 ? "overdue" : "upcoming";
  const summary = `$${money(spent)} of $${money(planned)}${pct != null ? ` · ${Math.round(pct * 100)}%` : ""}`;
  const count = pct != null ? Math.round(pct * 100) : Math.round(spent);
  return card("budget", [], count, summary, {
    progress: { current: spent, target: planned, unit: "$" },
    severity,
  });
}
