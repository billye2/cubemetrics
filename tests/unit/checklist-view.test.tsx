// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, within, cleanup, waitFor } from "@testing-library/react";

const { checklistAddAction, checklistToggleAction, checklistDeleteAction } = vi.hoisted(() => ({
  checklistAddAction: vi.fn(async (_app: string, _type: string, _title: string, _note: string, _due: string) => {}),
  checklistToggleAction: vi.fn(async (_app: string, _id: number, _completed: boolean) => {}),
  checklistDeleteAction: vi.fn(async (_app: string, _id: number) => {}),
}));
vi.mock("@/app/app/_factories/actions", () => ({
  checklistAddAction,
  checklistToggleAction,
  checklistDeleteAction,
  checklistReorderAction: vi.fn(async () => {}),
  checklistSetDueAction: vi.fn(async () => {}),
}));

import { ChecklistView } from "@/app/app/_factories/ChecklistView";
import type { FactoryConfig } from "@/lib/modern/catalog";

const config = { listType: "tasks", itemLabel: "Task" } as FactoryConfig;
const APP = "groceries";

function dateAhead(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toLocaleDateString("en-CA");
}

const items = [
  { id: 1, title: "Overdue thing", note: null, completed: false, sort_order: 0, created_at: "2026-06-01T00:00:00Z", due_date: dateAhead(-2) },
  { id: 2, title: "Due today thing", note: null, completed: false, sort_order: 1, created_at: "2026-06-01T00:00:00Z", due_date: dateAhead(0) },
  { id: 3, title: "Later thing", note: null, completed: false, sort_order: 2, created_at: "2026-06-01T00:00:00Z", due_date: dateAhead(20) },
  { id: 4, title: "Done thing", note: null, completed: true, sort_order: 3, created_at: "2026-06-01T00:00:00Z", due_date: null },
];

beforeEach(() => {
  vi.clearAllMocks();
  cleanup();
});
afterEach(() => vi.unstubAllGlobals());

describe("ChecklistView — header", () => {
  it("shows completion %, things-left, and overdue/today chips", () => {
    render(<ChecklistView appId={APP} config={config} items={items} />);
    expect(screen.getByText("25%")).toBeTruthy(); // 1 of 4 done
    expect(screen.getByText("3 things left")).toBeTruthy();
    expect(screen.getByText("1 overdue")).toBeTruthy();
    expect(screen.getByText("1 due today")).toBeTruthy();
  });

  it("celebrates when everything is done", () => {
    const allDone = items.map((i) => ({ ...i, completed: true }));
    render(<ChecklistView appId={APP} config={config} items={allDone} />);
    expect(screen.getByText(/All clear/)).toBeTruthy();
  });
});

describe("ChecklistView — actions & grouping", () => {
  it("adds an item from the form", async () => {
    render(<ChecklistView appId={APP} config={config} items={items} />);
    fireEvent.change(screen.getByPlaceholderText("Add task…"), { target: { value: "Milk" } });
    const form = screen.getByPlaceholderText("Add task…").closest("form") as HTMLFormElement;
    fireEvent.submit(form);
    await waitFor(() => expect(checklistAddAction).toHaveBeenCalled());
    expect(checklistAddAction.mock.calls[0][2]).toBe("Milk");
  });

  it("toggles and deletes an item", async () => {
    vi.stubGlobal("confirm", vi.fn(() => true));
    render(<ChecklistView appId={APP} config={config} items={items} />);
    const row = screen.getByText("Overdue thing").closest("li") as HTMLElement;
    fireEvent.click(within(row).getByLabelText("Mark complete"));
    await waitFor(() => expect(checklistToggleAction).toHaveBeenCalledWith(APP, 1, true));
    fireEvent.click(within(row).getByRole("button", { name: "×" }));
    await waitFor(() => expect(checklistDeleteAction).toHaveBeenCalledWith(APP, 1));
  });

  it("groups active items into due buckets when sorted by Due", () => {
    render(<ChecklistView appId={APP} config={config} items={items} />);
    fireEvent.click(screen.getByRole("button", { name: "Due" }));
    // "Overdue" and "Later" headers are unique (row pills use a date / "Overdue · date")
    expect(screen.getByText("Overdue")).toBeTruthy();
    expect(screen.getByText("Later")).toBeTruthy();
    // the "Today" bucket renders too (header + the row's due pill → 2 matches)
    expect(screen.getAllByText("Today").length).toBeGreaterThanOrEqual(1);
  });
});
