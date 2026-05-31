import { describe, expect, it } from "vitest";
import {
  cumulativeSeries,
  formatCurrency,
  formatCurrencyCompact,
  monthlyBuckets,
  normalizeCurrency,
  ordinal,
  recurringHint,
  type ContributionRow,
} from "../../src/app/app/savings/lib";

function contrib(
  id: number,
  amount: number,
  contributed_on: string
): ContributionRow {
  return {
    id,
    goal_id: 1,
    amount,
    contributed_on,
    note: "",
    created_at: contributed_on + "T00:00:00Z",
  };
}

describe("normalizeCurrency", () => {
  it("uppercases and accepts known codes", () => {
    expect(normalizeCurrency("eur")).toBe("EUR");
    expect(normalizeCurrency("USD")).toBe("USD");
  });
  it("falls back to USD for unknown/empty", () => {
    expect(normalizeCurrency("")).toBe("USD");
    expect(normalizeCurrency(null)).toBe("USD");
    expect(normalizeCurrency("ZZZ")).toBe("USD");
  });
});

describe("formatCurrency", () => {
  it("includes a currency symbol and the amount", () => {
    const usd = formatCurrency(1250, "USD");
    expect(usd).toContain("1,250");
    expect(usd).toMatch(/\$|USD/);
  });
  it("handles zero / non-finite", () => {
    expect(formatCurrency(0, "USD")).toContain("0");
    expect(formatCurrency(NaN, "USD")).toContain("0");
  });
  it("compact form is shorter for big numbers", () => {
    const compact = formatCurrencyCompact(12300, "USD");
    expect(compact.length).toBeLessThan(formatCurrency(12300, "USD").length);
  });
});

describe("cumulativeSeries", () => {
  it("returns a running total oldest -> newest", () => {
    const s = cumulativeSeries([
      contrib(1, 100, "2026-01-10"),
      contrib(2, 50, "2026-01-05"),
      contrib(3, 25, "2026-02-01"),
    ]);
    expect(s.map((p) => p.total)).toEqual([50, 150, 175]);
    expect(s[0].date).toBe("2026-01-05");
  });
  it("is empty for no contributions", () => {
    expect(cumulativeSeries([])).toEqual([]);
  });
});

describe("monthlyBuckets", () => {
  it("fills the trailing N months including empty ones, oldest -> newest", () => {
    const now = new Date(2026, 2, 15); // March 2026
    const buckets = monthlyBuckets(
      [contrib(1, 200, "2026-03-01"), contrib(2, 100, "2026-01-20")],
      3,
      now
    );
    expect(buckets.map((b) => b.month)).toEqual(["2026-01", "2026-02", "2026-03"]);
    expect(buckets.map((b) => b.total)).toEqual([100, 0, 200]);
  });
});

describe("recurringHint", () => {
  it("returns null with fewer than 3 deposits", () => {
    expect(recurringHint([contrib(1, 100, "2026-01-01")])).toBeNull();
  });
  it("detects a typical amount and day-of-month", () => {
    const h = recurringHint([
      contrib(1, 200, "2026-01-02"),
      contrib(2, 200, "2026-02-01"),
      contrib(3, 200, "2026-03-03"),
    ]);
    expect(h).not.toBeNull();
    expect(h!.typicalAmount).toBe(200);
    expect(h!.typicalDay).toBeGreaterThanOrEqual(1);
    expect(h!.typicalDay).toBeLessThanOrEqual(3);
  });
});

describe("ordinal", () => {
  it("formats common ordinals", () => {
    expect(ordinal(1)).toBe("1st");
    expect(ordinal(2)).toBe("2nd");
    expect(ordinal(3)).toBe("3rd");
    expect(ordinal(4)).toBe("4th");
    expect(ordinal(11)).toBe("11th");
    expect(ordinal(21)).toBe("21st");
    expect(ordinal(23)).toBe("23rd");
  });
});
