import { describe, it, expect } from "vitest";
import {
  bucketStatus,
  worstStatus,
  sortItems,
  todoToday,
  habitsToday,
  sumToday,
  budgetToday,
  billsToday,
} from "@/lib/spine/lib";
import { ITEM_CAP, type TodayItem, type SpineToday, type SpineCtx } from "@/lib/spine/types";
import { adapter as todoAdapter } from "@/lib/spine/adapters/todo";
import { adapter as habitsAdapter } from "@/lib/spine/adapters/habits";
import { adapter as waterAdapter } from "@/lib/spine/adapters/water";
import { adapter as journalAdapter } from "@/lib/spine/adapters/journal";
import { adapter as budgetAdapter } from "@/lib/spine/adapters/budget";
import { adapter as billsAdapter } from "@/lib/spine/adapters/bills";

const TODAY = "2026-05-31";

describe("today shaping helpers", () => {
  it("bucketStatus relative to today", () => {
    expect(bucketStatus("2026-05-30", TODAY)).toBe("overdue");
    expect(bucketStatus("2026-05-31", TODAY)).toBe("due");
    expect(bucketStatus("2026-06-01", TODAY)).toBe("upcoming");
    expect(bucketStatus(null, TODAY)).toBe("upcoming");
  });

  it("worstStatus picks the most urgent; [] -> done", () => {
    const mk = (status: TodayItem["status"]): TodayItem => ({ id: "x", label: "x", status });
    expect(worstStatus([mk("due"), mk("overdue"), mk("upcoming")])).toBe("overdue");
    expect(worstStatus([mk("done"), mk("done")])).toBe("done");
    expect(worstStatus([])).toBe("done");
  });

  it("sortItems orders worst-first then soonest due, capped at ITEM_CAP", () => {
    const items: TodayItem[] = [
      { id: "a", label: "a", status: "upcoming", due: "2026-06-05" },
      { id: "b", label: "b", status: "overdue", due: "2026-05-20" },
      { id: "c", label: "c", status: "due", due: "2026-05-31" },
      { id: "d", label: "d", status: "overdue", due: "2026-05-10" },
    ];
    const sorted = sortItems(items);
    expect(sorted.map((i) => i.id)).toEqual(["d", "b", "c", "a"]);
    expect(sortItems(Array.from({ length: 12 }, (_, i) => ({ id: String(i), label: "x", status: "due" as const }))))
      .toHaveLength(ITEM_CAP);
  });
});

describe("per-app builders", () => {
  const invariants = (card: SpineToday) => {
    expect(card.count).toBeGreaterThanOrEqual(card.items.length);
    expect(card.items.length).toBeLessThanOrEqual(ITEM_CAP);
    expect(card.severity).toBe(worstStatus(card.items));
    expect(card.href).toBe(`/app/${card.appId}`);
  };

  it("todoToday counts open + flags overdue", () => {
    const card = todoToday(
      [
        { id: 1, title: "a", due_date: "2026-05-30" },
        { id: 2, title: "b", due_date: null },
      ],
      TODAY,
    );
    expect(card.count).toBe(2);
    expect(card.summary).toBe("2 open · 1 overdue");
    expect(card.severity).toBe("overdue");
    invariants(card);
  });

  it("habitsToday: remaining = active - checked, with progress", () => {
    const card = habitsToday([{ id: 1, name: "Run" }, { id: 2, name: "Read" }], new Set([1]), TODAY);
    expect(card.count).toBe(1);
    expect(card.summary).toBe("1/2 done");
    expect(card.progress).toEqual({ current: 1, target: 2 });
    expect(card.severity).toBe("due");
    invariants(card);
  });

  it("habitsToday all done -> severity done", () => {
    const card = habitsToday([{ id: 1, name: "Run" }], new Set([1]), TODAY);
    expect(card.severity).toBe("done");
    expect(card.summary).toBe("1/1 done");
  });

  it("sumToday (water): total vs goal + progress", () => {
    const under = sumToday([{ value: 2 }, { value: 3 }], 8);
    expect(under.count).toBe(5);
    expect(under.summary).toBe("5/8 glasses");
    expect(under.severity).toBe("due");
    expect(under.progress).toEqual({ current: 5, target: 8, unit: "glasses" });
    expect(sumToday([{ value: 8 }], 8).severity).toBe("done");
    expect(sumToday([], 8).summary).toBe("0/8 glasses");
  });

  it("budgetToday: pct + over-budget severity", () => {
    const ok = budgetToday(1000, 620);
    expect(ok.summary).toBe("$620 of $1,000 · 62%");
    expect(ok.severity).toBe("upcoming");
    expect(ok.progress).toEqual({ current: 620, target: 1000, unit: "$" });
    expect(budgetToday(1000, 1100).severity).toBe("overdue");
    expect(budgetToday(0, 50).summary).toBe("$50 of $0");
  });

  it("billsToday keeps due-soon + overdue, drops far-future and no-due", () => {
    const card = billsToday(
      [
        { id: 1, name: "Rent", amount: 1200, due_date: "2026-05-30" }, // overdue
        { id: 2, name: "Net", amount: 60, due_date: "2026-06-03" }, // due soon
        { id: 3, name: "Gym", amount: 30, due_date: "2026-08-01" }, // far future (dropped)
        { id: 4, name: "X", amount: 5, due_date: null }, // no due (dropped)
      ],
      TODAY,
      "2026-06-07",
    );
    expect(card.count).toBe(2);
    expect(card.summary).toBe("2 due soon");
    expect(card.severity).toBe("overdue");
    invariants(card);
  });
});

// ── Security Finding 1: every adapter today() MUST filter by user_id. Under the
// session client a missing filter is a no-op, but Phase 4 runs these under the
// service-role client (RLS bypassed) where it would leak across tenants. ───────
describe("🔒 adapter user_id filter invariant", () => {
  function mockClient(result: { data: unknown; error: unknown } = { data: [], error: null }) {
    const calls: { method: string; args: unknown[] }[] = [];
    const b: Record<string, (...a: unknown[]) => unknown> & { then?: unknown } = {};
    for (const m of ["from", "select", "eq", "gte", "lte", "lt", "gt", "in", "limit", "order", "insert", "update", "delete", "upsert", "single", "maybeSingle", "rpc"]) {
      b[m] = (...args: unknown[]) => {
        calls.push({ method: m, args });
        return b;
      };
    }
    (b as { then: unknown }).then = (resolve: (v: unknown) => void) => resolve(result);
    return { client: b, calls };
  }

  const ctxWith = (client: unknown): SpineCtx =>
    ({ supabase: client, userId: "U1", tz: "UTC", now: new Date("2026-05-31T12:00:00Z") }) as SpineCtx;

  const adapters = [todoAdapter, habitsAdapter, waterAdapter, journalAdapter, budgetAdapter, billsAdapter];

  for (const a of adapters) {
    it(`${a.appId}.today() filters by user_id`, async () => {
      const { client, calls } = mockClient({ data: [], error: null });
      await a.today(ctxWith(client));
      const filtered = calls.some((c) => c.method === "eq" && c.args[0] === "user_id" && c.args[1] === "U1");
      expect(filtered, `${a.appId}.today() must call .eq("user_id", …)`).toBe(true);
    });
  }
});
