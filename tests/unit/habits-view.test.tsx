// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, within, cleanup, waitFor } from "@testing-library/react";

const { addHabit, checkInAction, deleteHabitAction, renameHabitAction } = vi.hoisted(() => ({
  addHabit: vi.fn(async (_name: string) => {}),
  checkInAction: vi.fn(async (_id: number) => {}),
  deleteHabitAction: vi.fn(async (_id: number) => {}),
  renameHabitAction: vi.fn(async (_id: number, _name: string) => {}),
}));
vi.mock("@/app/app/habits/actions", () => ({
  addHabit,
  checkInAction,
  deleteHabitAction,
  renameHabitAction,
}));

import { HabitsView } from "@/app/app/habits/HabitsView";
import { isoDaysAgo } from "@/app/app/habits/lib";

// Meditate: checked today + yesterday → 2 days inside the 30d window.
// Read: never checked.
const habits = [
  {
    id: 1,
    name: "Meditate",
    frequency: "daily",
    created_at: isoDaysAgo(10),
    streak: 2,
    checkedToday: true,
    weekCount: 2,
    checkinDates: [isoDaysAgo(0), isoDaysAgo(1)],
  },
  {
    id: 2,
    name: "Read",
    frequency: "daily",
    created_at: isoDaysAgo(5),
    streak: 0,
    checkedToday: false,
    weekCount: 0,
    checkinDates: [],
  },
];

const RATE_30 = Math.round((2 / 30) * 100); // = 7

beforeEach(() => {
  vi.clearAllMocks();
  cleanup();
});
afterEach(() => vi.unstubAllGlobals());

describe("HabitsView — today + summary", () => {
  it("shows the empty state with no habits", () => {
    render(<HabitsView habits={[]} />);
    expect(screen.getByText("No habits yet.")).toBeTruthy();
  });

  it("renders the today progress count", () => {
    render(<HabitsView habits={habits} />);
    expect(screen.getByText("1/2 done")).toBeTruthy();
  });

  it("shows a streak badge on a checked tile and the undo label", () => {
    render(<HabitsView habits={habits} />);
    const tile = screen.getByLabelText(/Meditate checked in for today/);
    expect(within(tile).getByText("2")).toBeTruthy(); // streak badge
  });

  it("checks in an unchecked habit on tap", async () => {
    render(<HabitsView habits={habits} />);
    fireEvent.click(screen.getByLabelText("Check in Read"));
    await waitFor(() => expect(checkInAction).toHaveBeenCalledWith(2));
  });
});

describe("HabitsView — habit rows", () => {
  it("shows streak, weekly count, and the 30-day completion rate", () => {
    render(<HabitsView habits={habits} />);
    expect(screen.getByText("2/7 this week")).toBeTruthy();
    expect(screen.getByText(`${RATE_30}% · 30d`)).toBeTruthy(); // wired-up completionRate
  });

  it("expands the heatmap history", () => {
    render(<HabitsView habits={habits} />);
    fireEvent.click(screen.getAllByLabelText("Show history")[0]);
    expect(screen.getByText("Last 8 weeks")).toBeTruthy();
  });

  it("renames a habit via inline edit", async () => {
    render(<HabitsView habits={habits} />);
    const row = screen.getAllByLabelText("Rename habit")[0].closest("li") as HTMLElement;
    fireEvent.click(within(row).getByLabelText("Rename habit"));
    fireEvent.change(within(row).getByRole("textbox"), { target: { value: "Meditate 10m" } });
    fireEvent.click(within(row).getByLabelText("Save"));
    await waitFor(() => expect(renameHabitAction).toHaveBeenCalledWith(1, "Meditate 10m"));
  });

  it("deletes a habit when confirmed, not when dismissed", async () => {
    vi.stubGlobal("confirm", vi.fn(() => false));
    render(<HabitsView habits={habits} />);
    fireEvent.click(screen.getAllByLabelText("Delete habit")[0]);
    expect(deleteHabitAction).not.toHaveBeenCalled();

    vi.stubGlobal("confirm", vi.fn(() => true));
    fireEvent.click(screen.getAllByLabelText("Delete habit")[0]);
    await waitFor(() => expect(deleteHabitAction).toHaveBeenCalledWith(1));
  });
});

describe("HabitsView — add form", () => {
  it("adds a new habit on submit", async () => {
    render(<HabitsView habits={habits} />);
    fireEvent.change(screen.getByPlaceholderText("New habit…"), {
      target: { value: "Exercise" },
    });
    const form = screen.getByPlaceholderText("New habit…").closest("form") as HTMLFormElement;
    fireEvent.submit(form);
    await waitFor(() => expect(addHabit).toHaveBeenCalledWith("Exercise"));
  });
});
