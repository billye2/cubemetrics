// Pure, DB-free helpers for the spine. All branchy logic lives here (like
// xp/rules.ts::scoreDay) so adapters stay thin and the logic is unit-tested.
import { type TodayItem, type TodayStatus, type SpineToday, STATUS_ORDER, ITEM_CAP } from "./types";

// ── Capture parsing (used by adapter quickLog/match) ────────────────────────

/** First positive number in the string, else `fallback`. "w 2"→2, "water"→1, "w -3"→1. */
export function parseLeadingNumber(s: string, fallback = 1): number {
  const m = s.match(/-?\d+(\.\d+)?/);
  if (!m) return fallback;
  const n = parseFloat(m[0]);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/** Strip a leading command word (case-insensitive, word-boundary). "todo call mom"→"call mom". */
export function stripPrefix(s: string, prefixes: string[]): string {
  const t = s.trim();
  for (const p of prefixes) {
    const re = new RegExp(`^${p}\\b\\s*`, "i");
    if (re.test(t)) return t.replace(re, "").trim();
  }
  return t;
}

/** Best name match: exact > startsWith > includes (case-insensitive). null if no overlap. */
export function fuzzyFind<T>(q: string, items: T[], key: (t: T) => string): T | null {
  const needle = q.trim().toLowerCase();
  if (!needle) return null;
  let best: T | null = null;
  let bestScore = 0;
  for (const it of items) {
    const k = key(it).toLowerCase();
    const s = k === needle ? 3 : k.startsWith(needle) ? 2 : k.includes(needle) ? 1 : 0;
    if (s > bestScore) {
      bestScore = s;
      best = it;
    }
  }
  return best;
}

/** Rank loggable apps for a capture string by each adapter's match(). Pure. */
export function rankCandidates(
  input: string,
  adapters: { appId: string; match: (s: string) => number }[],
): { appId: string; score: number }[] {
  return adapters
    .map((a) => ({ appId: a.appId, score: a.match(input) }))
    .filter((x) => x.score > 0)
    .sort((x, y) => y.score - x.score);
}

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
