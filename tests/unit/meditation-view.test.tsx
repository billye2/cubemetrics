// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, within, cleanup, waitFor, act } from "@testing-library/react";

const { logSitAction, editSitAction, deleteSitAction, setGoalAction } = vi.hoisted(() => ({
  logSitAction: vi.fn(async (_m: number, _l: string, _s: string | null) => {}),
  editSitAction: vi.fn(async (_id: number, _m: number, _l: string, _s: string | null) => {}),
  deleteSitAction: vi.fn(async (_id: number) => {}),
  setGoalAction: vi.fn(async (_m: number) => {}),
}));
vi.mock("@/app/app/meditation/actions", () => ({
  logSitAction,
  editSitAction,
  deleteSitAction,
  setGoalAction,
}));

import { MeditationView } from "@/app/app/meditation/MeditationView";
import type { Entry } from "@/app/app/meditation/lib";

function isoToday(hour = 9): string {
  const d = new Date();
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

const entries: Entry[] = [
  { id: 1, minutes: 10, label: "Box breathing", sid: "s2", createdAt: isoToday(7) },
];

beforeEach(() => {
  vi.clearAllMocks();
  cleanup();
});
afterEach(() => vi.unstubAllGlobals());

describe("MeditationView — Today", () => {
  it("shows today's minutes against the goal", () => {
    render(<MeditationView entries={entries} goal={20} />);
    // hero number carries the 52px display class (distinct from the entry-row "10")
    expect(screen.getAllByText("10").some((el) => el.className.includes("text-[52px]"))).toBe(true);
    expect(screen.getByText("of 20 min")).toBeTruthy();
    expect(screen.getByText(/from today’s goal/)).toBeTruthy(); // 10 remaining
  });

  it("quick-adds minutes", async () => {
    render(<MeditationView entries={entries} goal={20} />);
    fireEvent.click(screen.getByText("+10").closest("button")!);
    await waitFor(() => expect(logSitAction).toHaveBeenCalledWith(10, "Quick 10-min sit", null));
  });

  it("logs a sit from the LOG sheet with a chosen preset", async () => {
    render(<MeditationView entries={entries} goal={20} />);
    fireEvent.click(screen.getByText("LOG").closest("button")!);
    const dialog = screen.getByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "15 min" }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Log sit" }));
    await waitFor(() => expect(logSitAction).toHaveBeenCalledWith(15, "15-min sit", null));
  });

  it("edits an existing sit", async () => {
    render(<MeditationView entries={entries} goal={20} />);
    fireEvent.click(screen.getByLabelText("Edit sit"));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByDisplayValue("Box breathing")).toBeTruthy();
    fireEvent.click(within(dialog).getByRole("button", { name: "Save changes" }));
    await waitFor(() => expect(editSitAction).toHaveBeenCalledWith(1, 10, "Box breathing", "s2"));
  });
});

describe("MeditationView — tabs", () => {
  it("opens a session in the player from the Meditate tab", () => {
    render(<MeditationView entries={entries} goal={20} />);
    fireEvent.click(screen.getByRole("button", { name: "Meditate" }));
    fireEvent.click(screen.getByText("Morning Clarity").closest("button")!);
    // player overlay
    expect(screen.getByText("BREATHE")).toBeTruthy();
    expect(screen.getByLabelText("Pause")).toBeTruthy();
  });

  it("adjusts the daily goal from the You tab", async () => {
    render(<MeditationView entries={entries} goal={20} />);
    fireEvent.click(screen.getByRole("button", { name: "You" }));
    fireEvent.click(screen.getByLabelText("Increase goal"));
    await waitFor(() => expect(setGoalAction).toHaveBeenCalledWith(25));
  });
});

describe("MeditationView — player completion", () => {
  it("auto-logs the session's minutes when the timer finishes", async () => {
    vi.useFakeTimers();
    try {
      render(<MeditationView entries={[]} goal={20} />);
      fireEvent.click(screen.getByRole("button", { name: "Meditate" }));
      // "Reset in 3" is a 3-minute session → 180s
      fireEvent.click(screen.getByText("Reset in 3").closest("button")!);
      // run the real-time countdown past the end
      await act(async () => {
        await vi.advanceTimersByTimeAsync(200_000);
      });
      fireEvent.click(screen.getByRole("button", { name: "Done" }));
      expect(logSitAction).toHaveBeenCalledWith(3, "Reset in 3", "s6");
    } finally {
      vi.useRealTimers();
    }
  });
});
