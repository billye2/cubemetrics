import { describe, it, expect } from "vitest";
import {
  addMonths,
  balanceRemaining,
  debtTimeline,
  monthKey,
  monthKeyLabel,
  monthLabel,
  orderByStrategy,
  paidFraction,
  paidOffInfo,
  portfolioTimeline,
  portfolioProjectionTimeline,
  portfolioTotals,
  projectPayoff,
  projectionTimeline,
  statsFor,
  totalPaid,
  type DebtRow,
  type PaymentRow,
} from "@/app/app/debtpayoff/lib";

const NOW = new Date(2026, 4, 29); // 2026-05-29 (local)

function payment(over: Partial<PaymentRow>): PaymentRow {
  return {
    id: 1,
    debt_id: 1,
    amount: 100,
    paid_on: "2026-05-01",
    note: "",
    created_at: "2026-05-01T00:00:00Z",
    ...over,
  };
}

function debt(over: Partial<DebtRow>): DebtRow {
  return {
    id: 1,
    name: "Visa",
    original_balance: 1000,
    current_balance: 1000,
    apr: 0,
    min_payment: 100,
    status: "active",
    created_at: "2026-01-01T00:00:00Z",
    ...over,
  };
}

describe("totalPaid", () => {
  it("sums amounts", () => {
    expect(totalPaid([payment({ amount: 100 }), payment({ amount: 250.5 })])).toBe(
      350.5
    );
  });
  it("is zero for empty", () => {
    expect(totalPaid([])).toBe(0);
  });
});

describe("balanceRemaining", () => {
  it("subtracts payments from original", () => {
    expect(balanceRemaining(1000, [payment({ amount: 300 })])).toBe(700);
  });
  it("floors at zero (never negative)", () => {
    expect(balanceRemaining(1000, [payment({ amount: 1500 })])).toBe(0);
  });
  it("rounds to cents", () => {
    expect(balanceRemaining(100, [payment({ amount: 33.333 })])).toBe(66.67);
  });
});

describe("paidFraction", () => {
  it("climbs toward 1 as balance falls", () => {
    expect(paidFraction(1000, 750)).toBe(0.25);
    expect(paidFraction(1000, 0)).toBe(1);
  });
  it("is 1 when fully paid even with zero original", () => {
    expect(paidFraction(0, 0)).toBe(1);
  });
  it("clamps to 0..1", () => {
    expect(paidFraction(1000, 1200)).toBe(0);
  });
});

describe("projectPayoff", () => {
  it("no-interest: simple division", () => {
    const p = projectPayoff(1000, 0, 100, NOW);
    expect(p.months).toBe(10);
    expect(p.totalInterest).toBe(0);
    expect(p.neverPaysOff).toBe(false);
  });
  it("zero balance pays off in 0 months", () => {
    const p = projectPayoff(0, 20, 100, NOW);
    expect(p.months).toBe(0);
    expect(p.totalInterest).toBe(0);
  });
  it("accrues interest over the payoff", () => {
    // $1000 @ 12% APR (1%/mo), $100/mo. First month interest = $10.
    const p = projectPayoff(1000, 12, 100, NOW);
    expect(p.months).toBeGreaterThan(10); // interest stretches it past 10
    expect(p.months).toBeLessThanOrEqual(12);
    expect(p.totalInterest!).toBeGreaterThan(0);
  });
  it("flags a payment that can't cover interest", () => {
    // $1000 @ 24% APR (2%/mo) = $20/mo interest; $15 payment never wins.
    const p = projectPayoff(1000, 24, 15, NOW);
    expect(p.neverPaysOff).toBe(true);
    expect(p.months).toBeNull();
    expect(p.totalInterest).toBeNull();
  });
  it("returns null projection with no payment", () => {
    const p = projectPayoff(1000, 12, 0, NOW);
    expect(p.months).toBeNull();
    expect(p.neverPaysOff).toBe(false);
  });
  it("sets a payoff month string", () => {
    const p = projectPayoff(1000, 0, 100, NOW);
    expect(p.payoffMonth).toBe("2027-03-01"); // May 2026 + 10 months
  });
});

describe("addMonths / monthLabel", () => {
  it("adds whole months crossing a year", () => {
    expect(addMonths(NOW, 10)).toBe("2027-03-01");
    expect(addMonths(NOW, 0)).toBe("2026-05-01");
  });
  it("labels a month", () => {
    expect(monthLabel("2027-03-01")).toMatch(/2027/);
  });
});

describe("orderByStrategy", () => {
  const debts = [
    { id: 1, balance: 5000, apr: 8 },
    { id: 2, balance: 800, apr: 22 },
    { id: 3, balance: 2000, apr: 15 },
  ];
  it("snowball: smallest balance first", () => {
    expect(orderByStrategy(debts, "snowball").map((d) => d.id)).toEqual([2, 3, 1]);
  });
  it("avalanche: highest APR first", () => {
    expect(orderByStrategy(debts, "avalanche").map((d) => d.id)).toEqual([2, 3, 1]);
  });
  it("avalanche differs from snowball when APR and balance disagree", () => {
    const d = [
      { id: 1, balance: 100, apr: 5 }, // tiny balance, low APR
      { id: 2, balance: 9000, apr: 25 }, // big balance, high APR
    ];
    expect(orderByStrategy(d, "snowball").map((x) => x.id)).toEqual([1, 2]);
    expect(orderByStrategy(d, "avalanche").map((x) => x.id)).toEqual([2, 1]);
  });
  it("does not mutate the input", () => {
    const input = [...debts];
    orderByStrategy(input, "snowball");
    expect(input.map((d) => d.id)).toEqual([1, 2, 3]);
  });
});

describe("statsFor", () => {
  it("derives balance, fraction, projection", () => {
    const d = debt({ original_balance: 1000, apr: 0, min_payment: 100 });
    const s = statsFor(d, [payment({ amount: 250 })], NOW);
    expect(s.paid).toBe(250);
    expect(s.balance).toBe(750);
    expect(s.fraction).toBe(0.25);
    expect(s.complete).toBe(false);
    expect(s.projection.months).toBe(8); // 750 / 100 = ceil(7.5)
  });
  it("flags a fully paid debt", () => {
    const d = debt({ original_balance: 500 });
    const s = statsFor(d, [payment({ amount: 600 })], NOW);
    expect(s.complete).toBe(true);
    expect(s.balance).toBe(0);
    expect(s.fraction).toBe(1);
  });
});

describe("portfolioTotals", () => {
  it("aggregates active balances, minimums, and counts", () => {
    const debts = [
      debt({ id: 1, original_balance: 1000, apr: 0, min_payment: 100 }),
      debt({ id: 2, original_balance: 2000, apr: 0, min_payment: 200 }),
      debt({ id: 3, original_balance: 500, apr: 0, min_payment: 50 }),
    ];
    const byDebt = new Map<number, PaymentRow[]>([
      [1, [payment({ id: 1, debt_id: 1, amount: 300 })]],
      [3, [payment({ id: 2, debt_id: 3, amount: 500 })]], // fully paid
    ]);
    const t = portfolioTotals(debts, byDebt, NOW);
    expect(t.totalBalance).toBe(2700); // 700 + 2000 + 0
    expect(t.totalOriginal).toBe(3500);
    expect(t.totalPaid).toBe(800);
    expect(t.combinedMinimums).toBe(300); // only the 2 active debts
    expect(t.activeCount).toBe(2);
    expect(t.paidCount).toBe(1);
  });
  it("debt-free month is the latest single-debt payoff", () => {
    const debts = [
      debt({ id: 1, original_balance: 1000, apr: 0, min_payment: 100 }), // 10 mo
      debt({ id: 2, original_balance: 600, apr: 0, min_payment: 100 }), // 6 mo
    ];
    const t = portfolioTotals(debts, new Map(), NOW);
    expect(t.debtFreeMonth).toBe(addMonths(NOW, 10));
  });
  it("debt-free month is null when a debt never pays off", () => {
    const debts = [
      debt({ id: 1, original_balance: 1000, apr: 24, min_payment: 5 }),
    ];
    const t = portfolioTotals(debts, new Map(), NOW);
    expect(t.debtFreeMonth).toBeNull();
  });
});

describe("monthKey / monthKeyLabel", () => {
  it("extracts YYYY-MM", () => {
    expect(monthKey("2026-05-17")).toBe("2026-05");
    expect(monthKey("2026-12-01")).toBe("2026-12");
  });
  it("labels a YYYY-MM key", () => {
    expect(monthKeyLabel("2027-03")).toMatch(/2027/);
  });
});

describe("debtTimeline (historical burn-down)", () => {
  it("is empty with no payments", () => {
    expect(debtTimeline(1000, [])).toEqual([]);
  });
  it("subtracts each month's payments cumulatively", () => {
    const pays = [
      payment({ id: 1, amount: 200, paid_on: "2026-01-15" }),
      payment({ id: 2, amount: 300, paid_on: "2026-02-10" }),
    ];
    const t = debtTimeline(1000, pays);
    expect(t).toEqual([
      { month: "2026-01", balance: 800 },
      { month: "2026-02", balance: 500 },
    ]);
  });
  it("combines multiple payments in the same month", () => {
    const pays = [
      payment({ id: 1, amount: 100, paid_on: "2026-03-01" }),
      payment({ id: 2, amount: 150, paid_on: "2026-03-20" }),
    ];
    const t = debtTimeline(1000, pays);
    expect(t).toEqual([{ month: "2026-03", balance: 750 }]);
  });
  it("fills gap months carrying the balance forward", () => {
    const pays = [
      payment({ id: 1, amount: 100, paid_on: "2026-01-05" }),
      payment({ id: 2, amount: 100, paid_on: "2026-03-05" }), // skips Feb
    ];
    const t = debtTimeline(1000, pays);
    expect(t.map((p) => p.month)).toEqual(["2026-01", "2026-02", "2026-03"]);
    expect(t.map((p) => p.balance)).toEqual([900, 900, 800]);
  });
  it("floors at zero when overpaid", () => {
    const t = debtTimeline(500, [payment({ amount: 600, paid_on: "2026-04-01" })]);
    expect(t).toEqual([{ month: "2026-04", balance: 0 }]);
  });
});

describe("portfolioTimeline", () => {
  it("is empty with no payments anywhere", () => {
    const debts = [debt({ id: 1, original_balance: 1000 })];
    expect(portfolioTimeline(debts, new Map())).toEqual([]);
  });
  it("sums total owed across debts over a shared month range", () => {
    const debts = [
      debt({ id: 1, original_balance: 1000 }),
      debt({ id: 2, original_balance: 2000 }),
    ];
    const byDebt = new Map<number, PaymentRow[]>([
      [1, [payment({ id: 1, debt_id: 1, amount: 200, paid_on: "2026-01-10" })]],
      [2, [payment({ id: 2, debt_id: 2, amount: 500, paid_on: "2026-02-10" })]],
    ]);
    const t = portfolioTimeline(debts, byDebt);
    // Jan: 3000 - 200 = 2800; Feb: -500 = 2300
    expect(t).toEqual([
      { month: "2026-01", balance: 2800 },
      { month: "2026-02", balance: 2300 },
    ]);
  });
});

describe("projectionTimeline (forward)", () => {
  it("is empty for a zero balance or no payment", () => {
    expect(projectionTimeline(0, 10, 100, true, NOW)).toEqual([]);
    expect(projectionTimeline(1000, 10, 0, true, NOW)).toEqual([]);
  });
  it("no-interest burn-down reaches zero", () => {
    const t = projectionTimeline(1000, 20, 250, false, NOW);
    // first point is the starting balance, last is 0
    expect(t[0].balance).toBe(1000);
    expect(t[t.length - 1].balance).toBe(0);
    expect(t.length).toBe(5); // start + 4 monthly steps
  });
  it("accruing interest stretches the payoff longer", () => {
    const noInt = projectionTimeline(1000, 24, 100, false, NOW);
    const withInt = projectionTimeline(1000, 24, 100, true, NOW);
    expect(withInt.length).toBeGreaterThan(noInt.length);
  });
  it("returns empty when payment can't cover interest", () => {
    expect(projectionTimeline(1000, 24, 15, true, NOW)).toEqual([]);
  });
});

describe("portfolioProjectionTimeline", () => {
  it("is empty when nothing is payable", () => {
    const debts = [debt({ id: 1, original_balance: 1000, min_payment: 0 })];
    expect(portfolioProjectionTimeline(debts, new Map(), false, NOW)).toEqual([]);
  });
  it("burns the whole portfolio to zero without interest", () => {
    const debts = [
      debt({ id: 1, original_balance: 1000, apr: 0, min_payment: 250 }),
      debt({ id: 2, original_balance: 500, apr: 0, min_payment: 250 }),
    ];
    const t = portfolioProjectionTimeline(debts, new Map(), false, NOW);
    expect(t[0].balance).toBe(1500);
    expect(t[t.length - 1].balance).toBe(0);
  });
});

describe("paidOffInfo", () => {
  it("reports last payment date, total paid, and cleared amount", () => {
    const d = debt({ id: 1, original_balance: 800 });
    const pays = [
      payment({ id: 1, amount: 500, paid_on: "2026-02-01" }),
      payment({ id: 2, amount: 300, paid_on: "2026-04-15" }),
    ];
    const info = paidOffInfo(d, pays);
    expect(info.paidOn).toBe("2026-04-15");
    expect(info.totalPaid).toBe(800);
    expect(info.cleared).toBe(800);
  });
  it("handles no payments", () => {
    const info = paidOffInfo(debt({ original_balance: 100 }), []);
    expect(info.paidOn).toBeNull();
    expect(info.totalPaid).toBe(0);
  });
});
