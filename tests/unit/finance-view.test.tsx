// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, within, cleanup, waitFor } from "@testing-library/react";

const { financeAddAction, financeTogglePaidAction, financeDeleteAction } = vi.hoisted(() => ({
  financeAddAction: vi.fn(async (_a: string, _t: string, _n: string, _amt: number, _c: string, _d: string | null, _f: string) => {}),
  financeTogglePaidAction: vi.fn(async (_a: string, _id: number, _paid: boolean) => {}),
  financeDeleteAction: vi.fn(async (_a: string, _id: number) => {}),
}));
vi.mock("@/app/app/_factories/actions", () => ({
  financeAddAction,
  financeTogglePaidAction,
  financeDeleteAction,
}));

import { FinanceView } from "@/app/app/_factories/FinanceView";
import type { FactoryConfig } from "@/lib/modern/catalog";

const billConfig = { itemType: "bill", hasDueDate: true } as FactoryConfig;
const APP = "bills";

function dateAhead(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toLocaleDateString("en-CA");
}

const bills = [
  { id: 1, name: "Rent", amount: 1200, category: "Home", frequency: null, paid: false, due_date: dateAhead(-2), note: null, created_at: "2026-06-01T00:00:00Z" },
  { id: 2, name: "Internet", amount: 60, category: "Utilities", frequency: null, paid: false, due_date: dateAhead(3), note: null, created_at: "2026-06-01T00:00:00Z" },
  { id: 3, name: "Insurance", amount: 200, category: "Car", frequency: null, paid: false, due_date: dateAhead(20), note: null, created_at: "2026-06-01T00:00:00Z" },
];

beforeEach(() => {
  vi.clearAllMocks();
  cleanup();
});
afterEach(() => vi.unstubAllGlobals());

describe("FinanceView — bills bucketing", () => {
  it("groups unpaid bills into Overdue / This week / Later sections", () => {
    render(<FinanceView appId={APP} config={billConfig} items={bills} />);
    expect(screen.getByText("Overdue")).toBeTruthy();
    expect(screen.getByText("This week")).toBeTruthy();
    expect(screen.getByText("Later")).toBeTruthy();
  });

  it("adds a bill from the form", async () => {
    render(<FinanceView appId={APP} config={billConfig} items={bills} />);
    fireEvent.click(screen.getByRole("button", { name: "+ Add item" }));
    fireEvent.change(screen.getByPlaceholderText("Name"), { target: { value: "Phone" } });
    fireEvent.change(screen.getByPlaceholderText("Amount"), { target: { value: "45" } });
    const form = screen.getByPlaceholderText("Name").closest("form") as HTMLFormElement;
    fireEvent.submit(form);
    await waitFor(() => expect(financeAddAction).toHaveBeenCalled());
    expect(financeAddAction.mock.calls[0][2]).toBe("Phone");
  });

  it("toggles paid and deletes", async () => {
    vi.stubGlobal("confirm", vi.fn(() => true));
    render(<FinanceView appId={APP} config={billConfig} items={bills} />);
    const row = screen.getByText("Rent").closest("li") as HTMLElement;
    fireEvent.click(within(row).getByLabelText("Mark paid"));
    await waitFor(() => expect(financeTogglePaidAction).toHaveBeenCalledWith(APP, 1, true));
    fireEvent.click(within(row).getByRole("button", { name: "×" }));
    await waitFor(() => expect(financeDeleteAction).toHaveBeenCalledWith(APP, 1));
  });
});

describe("FinanceView — subscriptions", () => {
  const subConfig = { itemType: "subscription", hasDueDate: false } as FactoryConfig;
  const subs = [
    { id: 9, name: "Netflix", amount: 15, category: "Streaming", frequency: "monthly", paid: false, due_date: null, note: null, created_at: "2026-06-01T00:00:00Z" },
  ];
  it("renders subscriptions flat (no due buckets)", () => {
    render(<FinanceView appId={APP} config={subConfig} items={subs} />);
    expect(screen.getByText("Netflix")).toBeTruthy();
    expect(screen.queryByText("Overdue")).toBeNull();
  });
});
