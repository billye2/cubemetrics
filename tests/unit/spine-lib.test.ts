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
  financeDueToday,
  srsDueToday,
  scheduleToday,
  goalsToday,
  keepInTouchToday,
  plantcareToday,
  presenceToday,
} from "@/lib/spine/lib";
import { ITEM_CAP, type TodayItem, type SpineToday, type SpineCtx } from "@/lib/spine/types";
import { adapter as todoAdapter } from "@/lib/spine/adapters/todo";
import { adapter as habitsAdapter } from "@/lib/spine/adapters/habits";
import { adapter as waterAdapter } from "@/lib/spine/adapters/water";
import { adapter as journalAdapter } from "@/lib/spine/adapters/journal";
import { adapter as budgetAdapter } from "@/lib/spine/adapters/budget";
import { adapter as billsAdapter } from "@/lib/spine/adapters/bills";
import { adapter as medicationAdapter } from "@/lib/spine/adapters/medication";
import { adapter as carcareAdapter } from "@/lib/spine/adapters/carcare";
import { adapter as goalsAdapter } from "@/lib/spine/adapters/goals";
import { adapter as keepintouchAdapter } from "@/lib/spine/adapters/keepintouch";
import { adapter as plantcareAdapter } from "@/lib/spine/adapters/plantcare";
import { adapter as moodAdapter } from "@/lib/spine/adapters/mood";
import { adapter as energyAdapter } from "@/lib/spine/adapters/energy";
import { adapter as sleepAdapter } from "@/lib/spine/adapters/sleep";
import { adapter as invoicesAdapter } from "@/lib/spine/adapters/invoices";
import { adapter as flashcardsAdapter } from "@/lib/spine/adapters/flashcards";
import { adapter as vocabularyAdapter } from "@/lib/spine/adapters/vocabulary";

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

  // scheduleToday: next_due = last_done + interval_days; null last_done = due now.
  // TODAY = 2026-05-31, soon (= TODAY + 7) = 2026-06-07.
  it("scheduleToday treats a never-done item as due now", () => {
    const card = scheduleToday(
      "medication",
      [{ id: 1, title: "Vitamin D", interval_days: 1, last_done: null }],
      TODAY,
      "2026-06-07",
    );
    expect(card.count).toBe(1);
    expect(card.items[0].status).toBe("due");
    expect(card.summary).toBe("1 due");
    expect(card.severity).toBe("due");
    invariants(card);
  });

  it("scheduleToday flags overdue, due-today, and keeps due-soon; drops far-future", () => {
    const card = scheduleToday(
      "medication",
      [
        { id: 1, title: "Antibiotic", interval_days: 1, last_done: "2026-05-29" }, // next 05-30 → overdue
        { id: 2, title: "Statin", interval_days: 1, last_done: "2026-05-30" }, // next 05-31 → due
        { id: 3, title: "Refill", interval_days: 6, last_done: "2026-05-30" }, // next 06-05 → upcoming (kept)
        { id: 4, title: "Quarterly shot", interval_days: 30, last_done: "2026-05-31" }, // next 06-30 → dropped
      ],
      TODAY,
      "2026-06-07",
    );
    expect(card.count).toBe(3); // far-future shot dropped
    expect(card.summary).toBe("1 overdue · 1 due");
    expect(card.severity).toBe("overdue");
    expect(card.items.map((i) => i.id)).toContain("medication:3");
    expect(card.items.find((i) => i.id === "medication:3")?.status).toBe("upcoming");
    invariants(card);
  });

  it("goalsToday excludes completed, flags overdue, shows avg progress", () => {
    const card = goalsToday(
      [
        { id: 1, title: "Run 100mi", target_value: 100, current_value: 40, due_date: "2026-05-20", status: "active" }, // overdue
        { id: 2, title: "Read 12", target_value: 12, current_value: 6, due_date: null, status: "active" }, // upcoming, 50%
        { id: 3, title: "Old", target_value: 5, current_value: 5, due_date: null, status: "completed" }, // excluded
      ],
      TODAY,
    )!;
    expect(card.count).toBe(2);
    expect(card.summary).toBe("2 active · 1 overdue");
    expect(card.severity).toBe("overdue");
    expect(card.progress).toEqual({ current: 45, target: 100, unit: "%" }); // (40 + 50) / 2
    invariants(card);
  });

  it("goalsToday: reached target = done item; no overdue shows avg", () => {
    const card = goalsToday(
      [
        { id: 1, title: "A", target_value: 10, current_value: 5, due_date: null, status: "active" }, // 50%, upcoming
        { id: 2, title: "B", target_value: 10, current_value: 10, due_date: null, status: "active" }, // reached -> done
      ],
      TODAY,
    )!;
    expect(card.summary).toBe("2 active · 75% avg");
    expect(card.severity).toBe("upcoming");
    expect(card.items.find((i) => i.id === "goal:2")?.status).toBe("done");
    invariants(card);
  });

  it("goalsToday returns null when nothing is active", () => {
    expect(
      goalsToday([{ id: 1, title: "X", target_value: 5, current_value: 5, due_date: null, status: "completed" }], TODAY),
    ).toBeNull();
  });

  it("keepInTouchToday skips no-cadence, flags overdue/due, drops far-future", () => {
    const card = keepInTouchToday(
      [
        { id: 1, name: "Mom", cadence_days: 7, last_contacted: null }, // never → due
        { id: 2, name: "Sam", cadence_days: 7, last_contacted: "2026-05-20" }, // next 05-27 → overdue
        { id: 3, name: "Lee", cadence_days: 30, last_contacted: "2026-05-30" }, // next 06-29 → dropped
        { id: 4, name: "Pat", cadence_days: null, last_contacted: "2026-01-01" }, // no cadence → skipped
      ],
      TODAY,
      "2026-06-07",
    );
    expect(card.count).toBe(2);
    expect(card.summary).toBe("1 overdue · 1 due");
    expect(card.severity).toBe("overdue");
    expect(card.items.map((i) => i.id)).toEqual(expect.arrayContaining(["keepintouch:1", "keepintouch:2"]));
    invariants(card);
  });

  it("plantcareToday: never-watered due, overdue/today flagged, far-future dropped", () => {
    const card = plantcareToday(
      [
        { id: 1, name: "Fern", frequency_days: 7, last_watered: null }, // never → due
        { id: 2, name: "Cactus", frequency_days: 3, last_watered: "2026-05-25" }, // next 05-28 → overdue
        { id: 3, name: "Pothos", frequency_days: 1, last_watered: "2026-05-30" }, // next 05-31 → due today
        { id: 4, name: "Palm", frequency_days: 30, last_watered: "2026-05-31" }, // next 06-30 → dropped
      ],
      TODAY,
      "2026-06-07",
    );
    expect(card.count).toBe(3);
    expect(card.summary).toBe("1 overdue · 2 due");
    expect(card.severity).toBe("overdue");
    invariants(card);
  });

  it("presenceToday: due when not logged, done when logged (journal-style count)", () => {
    const due = presenceToday("mood", false, "Log today's mood", "Mood logged");
    expect(due.severity).toBe("due");
    expect(due.count).toBe(1);
    expect(due.summary).toBe("Log today's mood");
    expect(due.items[0]).toMatchObject({ id: "mood:today", status: "due", href: "/app/mood" });
    expect(due.href).toBe("/app/mood");

    const done = presenceToday("mood", true, "Log today's mood", "Mood logged");
    expect(done.severity).toBe("done");
    expect(done.count).toBe(0); // nothing pending once logged (mirrors journal)
    expect(done.summary).toBe("Mood logged");
    expect(done.items[0].status).toBe("done");
  });

  it("financeDueToday namespaces to the given app (invoices)", () => {
    const card = financeDueToday(
      "invoices",
      [{ id: 7, name: "Acme", amount: 500, due_date: "2026-05-28" }], // overdue
      TODAY,
      "2026-06-07",
    );
    expect(card.appId).toBe("invoices");
    expect(card.href).toBe("/app/invoices");
    expect(card.items[0].id).toBe("invoices:7");
    expect(card.summary).toBe("1 due soon");
    expect(card.severity).toBe("overdue");
    invariants(card);
  });

  it("srsDueToday: count card, pluralizes, null when nothing due", () => {
    const card = srsDueToday("flashcards", 12, "card")!;
    expect(card.count).toBe(12);
    expect(card.summary).toBe("12 cards due");
    expect(card.severity).toBe("due");
    invariants(card);
    expect(srsDueToday("vocabulary", 1, "word")!.summary).toBe("1 word due");
    expect(srsDueToday("flashcards", 0, "card")).toBeNull();
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

  const adapters = [todoAdapter, habitsAdapter, waterAdapter, journalAdapter, budgetAdapter, billsAdapter, medicationAdapter, carcareAdapter, goalsAdapter, keepintouchAdapter, plantcareAdapter, moodAdapter, energyAdapter, sleepAdapter, invoicesAdapter, flashcardsAdapter, vocabularyAdapter];

  for (const a of adapters) {
    it(`${a.appId}.today() filters by user_id`, async () => {
      const { client, calls } = mockClient({ data: [], error: null });
      await a.today(ctxWith(client));
      const filtered = calls.some((c) => c.method === "eq" && c.args[0] === "user_id" && c.args[1] === "U1");
      expect(filtered, `${a.appId}.today() must call .eq("user_id", …)`).toBe(true);
    });
  }
});
