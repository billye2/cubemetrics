// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, within, cleanup, waitFor } from "@testing-library/react";

const { addCountdownAction, updateCountdownAction, deleteCountdownAction } = vi.hoisted(() => ({
  addCountdownAction: vi.fn(
    async (_t: string, _d: string, _ti: string, _c: string, _r: boolean, _n: string, _e?: string) => {},
  ),
  updateCountdownAction: vi.fn(
    async (_id: number, _t: string, _d: string, _ti: string, _c: string, _r: boolean, _n: string, _e?: string) => {},
  ),
  deleteCountdownAction: vi.fn(async (_id: number) => {}),
}));
vi.mock("@/app/app/countdown/actions", () => ({
  addCountdownAction,
  updateCountdownAction,
  deleteCountdownAction,
}));

import { CountdownsView } from "@/app/app/countdown/CountdownsView";

// target_date N days from today (local), as YYYY-MM-DD.
function dateAhead(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}
function todayInput(): string {
  return dateAhead(0);
}
const CREATED = "2026-01-01T00:00:00Z";

const rows = [
  { id: 1, title: "Dentist visit", target_date: dateAhead(2), target_time: null, category: "Health", recurring_yearly: false, note: null, created_at: CREATED },
  { id: 2, title: "Italy trip", target_date: dateAhead(5), target_time: null, category: "Travel", recurring_yearly: false, note: "Flights booked", created_at: CREATED, emoji: "🍝" },
  { id: 3, title: "Product launch", target_date: dateAhead(20), target_time: null, category: "Work", recurring_yearly: false, note: null, created_at: CREATED },
  { id: 4, title: "Cousin wedding", target_date: dateAhead(60), target_time: null, category: "Event", recurring_yearly: false, note: null, created_at: CREATED },
  { id: 5, title: "Old meetup", target_date: dateAhead(-1), target_time: null, category: "Personal", recurring_yearly: false, note: null, created_at: CREATED },
];

beforeEach(() => {
  vi.clearAllMocks();
  cleanup();
});
afterEach(() => vi.unstubAllGlobals());

describe("CountdownsView — layout", () => {
  it("shows the empty state with no rows", () => {
    render(<CountdownsView rows={[]} />);
    expect(screen.getByText("No countdowns yet.")).toBeTruthy();
  });

  it("promotes the soonest upcoming event to the hero", () => {
    render(<CountdownsView rows={rows} />);
    expect(screen.getByText("Next up")).toBeTruthy();
    expect(screen.getByText("Dentist visit")).toBeTruthy();
  });

  it("groups the rest into time buckets, hero excluded", () => {
    render(<CountdownsView rows={rows} />);
    ["This week", "This month", "Later", "Past"].forEach((b) =>
      expect(screen.getByText(b)).toBeTruthy(),
    );
    // hero (Dentist, +2d) is not duplicated into This week; Italy (+5d) is there
    expect(screen.getByText("Italy trip")).toBeTruthy();
    expect(screen.getByText("Old meetup")).toBeTruthy(); // Past bucket
  });
});

describe("CountdownsView — filter", () => {
  it("filters the list by category but leaves the hero", () => {
    render(<CountdownsView rows={rows} />);
    fireEvent.click(screen.getByRole("button", { name: "Work" }));
    expect(screen.getByText("Product launch")).toBeTruthy();
    expect(screen.queryByText("Italy trip")).toBeNull();
    // hero unaffected by the filter
    expect(screen.getByText("Dentist visit")).toBeTruthy();
  });
});

describe("CountdownsView — add / edit / delete", () => {
  it("renders a custom emoji on a card", () => {
    render(<CountdownsView rows={rows} />);
    expect(screen.getByText("🍝")).toBeTruthy(); // Italy trip's custom emoji
  });

  it("adds a countdown with a custom emoji from the FAB sheet", async () => {
    render(<CountdownsView rows={rows} />);
    fireEvent.click(screen.getByRole("button", { name: "Add countdown" })); // the FAB
    const dialog = screen.getByRole("dialog");
    fireEvent.change(within(dialog).getByPlaceholderText("e.g. Trip to Tokyo"), {
      target: { value: "Birthday party" },
    });
    fireEvent.change(within(dialog).getByLabelText("Emoji"), { target: { value: "🎂" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Fun" })); // category chip
    fireEvent.click(within(dialog).getByRole("button", { name: "Add countdown" })); // submit

    await waitFor(() => expect(addCountdownAction).toHaveBeenCalledTimes(1));
    const args = addCountdownAction.mock.calls[0];
    expect(args[0]).toBe("Birthday party");
    expect(args[1]).toBe(todayInput()); // date defaults to today
    expect(args[3]).toBe("Fun");
    expect(args[4]).toBe(false); // not recurring
    expect(args[6]).toBe("🎂"); // custom emoji persisted
  });

  it("opens a prefilled edit sheet from a card and saves", async () => {
    render(<CountdownsView rows={rows} />);
    fireEvent.click(screen.getByText("Italy trip"));
    const dialog = screen.getByRole("dialog");
    const titleInput = within(dialog).getByDisplayValue("Italy trip");
    fireEvent.change(titleInput, { target: { value: "Italy trip 2026" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Save changes" }));

    await waitFor(() => expect(updateCountdownAction).toHaveBeenCalledTimes(1));
    const args = updateCountdownAction.mock.calls[0];
    expect(args[0]).toBe(2);
    expect(args[1]).toBe("Italy trip 2026");
  });

  it("deletes from the edit sheet when confirmed", async () => {
    vi.stubGlobal("confirm", vi.fn(() => true));
    render(<CountdownsView rows={rows} />);
    fireEvent.click(screen.getByText("Italy trip"));
    fireEvent.click(screen.getByRole("button", { name: "Delete countdown" }));
    await waitFor(() => expect(deleteCountdownAction).toHaveBeenCalledWith(2));
  });
});
