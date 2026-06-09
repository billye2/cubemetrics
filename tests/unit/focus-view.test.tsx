// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, within, cleanup, waitFor } from "@testing-library/react";

// Mock the server actions (they pull in supabase/server which is RSC-only).
// vi.hoisted so the fns exist when the hoisted vi.mock factory runs.
const { saveFocusSessionAction, deleteFocusEntryAction } = vi.hoisted(() => ({
  saveFocusSessionAction: vi.fn(
    async (
      _minutes: number,
      _intent: string,
      _win: string,
      _rating: number,
      _done: string,
    ) => {},
  ),
  deleteFocusEntryAction: vi.fn(async (_id: number) => {}),
}));
vi.mock("@/app/app/focus/actions", () => ({
  saveFocusSessionAction,
  deleteFocusEntryAction,
}));

import { FocusView } from "@/app/app/focus/FocusView";

// ── Fixtures ──────────────────────────────────────────────────────────────
// Build timestamps relative to "now" so week/streak math is deterministic.
function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}
const TODAY = new Date().toISOString();

// A reflected session (modern JSON note) created today.
const reflected = {
  id: 1,
  value: 45,
  label: "Draft the investor update",
  note: JSON.stringify({ win: "Shipped the first three slides", rating: 4 }),
  created_at: TODAY,
};
// A legacy session whose note is a plain distraction string, not JSON.
const legacy = {
  id: 2,
  value: 30,
  label: "Inbox zero",
  note: "got distracted by slack twice",
  created_at: isoDaysAgo(1),
};

// MiniStat = <div>[<div>{value}</div><div>{label}</div>]; the label's parent
// is the card, so step up one from the label to read the value beside it.
function statCard(label: string): HTMLElement {
  return screen.getByText(label).parentElement as HTMLElement;
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("FocusView — home journal", () => {
  it("renders weekly stats, the timeline, and the reflection quote", () => {
    render(<FocusView entries={[reflected]} />);

    // 45 min this week, 1 intention met
    expect(screen.getByText("45m")).toBeTruthy();
    expect(within(statCard("intentions met")).getByText("1")).toBeTruthy();

    // timeline shows the intent, the italic win quote, and the minutes
    expect(screen.getByText("Draft the investor update")).toBeTruthy();
    expect(screen.getByText(/Shipped the first three slides/)).toBeTruthy();
    expect(screen.getByText("45 min")).toBeTruthy();
    // rating parsed from the JSON note (4 of 5)
    expect(screen.getByLabelText("Focus 4 of 5")).toBeTruthy();
  });

  it("degrades gracefully on a legacy (non-JSON) note: no quote, no rating", () => {
    render(<FocusView entries={[legacy]} />);
    expect(screen.getByText("Inbox zero")).toBeTruthy();
    // the raw distraction text is NOT surfaced as a reflection quote
    expect(screen.queryByText(/got distracted/)).toBeNull();
    // rating falls back to 0 of 5
    expect(screen.getByLabelText("Focus 0 of 5")).toBeTruthy();
  });

  it("shows the empty state when there are no sessions", () => {
    render(<FocusView entries={[]} />);
    expect(screen.getByText(/No sessions yet/)).toBeTruthy();
    // day-streak placeholder
    expect(within(statCard("day streak")).getByText("—")).toBeTruthy();
  });

  it("computes a multi-day streak (today + yesterday = 2)", () => {
    render(<FocusView entries={[reflected, legacy]} />);
    expect(within(statCard("day streak")).getByText("2")).toBeTruthy();
  });

  it("deletes a session (confirmed) via the action", async () => {
    vi.stubGlobal("confirm", vi.fn(() => true));
    render(<FocusView entries={[reflected]} />);
    fireEvent.click(screen.getByLabelText("Delete session"));
    await waitFor(() => expect(deleteFocusEntryAction).toHaveBeenCalledWith(1));
  });

  it("does not delete when the confirm is dismissed", () => {
    vi.stubGlobal("confirm", vi.fn(() => false));
    render(<FocusView entries={[reflected]} />);
    fireEvent.click(screen.getByLabelText("Delete session"));
    expect(deleteFocusEntryAction).not.toHaveBeenCalled();
  });
});

describe("FocusView — the setup → run → reflect machine", () => {
  it("gates Begin until an intention is typed, then enters the run", () => {
    render(<FocusView entries={[]} />);
    fireEvent.click(screen.getByRole("button", { name: /Set an intention/ }));

    const begin = screen.getByRole("button", { name: /Begin/ }) as HTMLButtonElement;
    expect(begin.disabled).toBe(true);

    fireEvent.change(screen.getByPlaceholderText(/Draft the investor update/), {
      target: { value: "Write the spec" },
    });
    expect(begin.disabled).toBe(false);

    fireEvent.click(begin);
    // run stage shows the held intention + the pause control
    expect(screen.getByText("Write the spec")).toBeTruthy();
    expect(screen.getByLabelText("Pause")).toBeTruthy();
  });

  it("Back from setup returns to the journal without starting a session", () => {
    render(<FocusView entries={[reflected]} />);
    fireEvent.click(screen.getByRole("button", { name: /Set an intention/ }));
    fireEvent.click(screen.getByLabelText("Back to journal"));
    expect(screen.getByText("Your focus journal")).toBeTruthy();
  });

  it("saving a reflection applies the win/rating fallbacks and persists", async () => {
    render(<FocusView entries={[]} />);
    fireEvent.click(screen.getByRole("button", { name: /Set an intention/ }));
    fireEvent.change(screen.getByPlaceholderText(/Draft the investor update/), {
      target: { value: "Write the spec" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Begin/ }));

    // end the run immediately — elapsed ≈ 0 floors to 1 minute
    fireEvent.click(screen.getByRole("button", { name: /done/i }));

    // reflect stage; save without filling win or rating
    expect(screen.getByText("Did you reach it?")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Save to journal/ }));

    await waitFor(() =>
      expect(saveFocusSessionAction).toHaveBeenCalledWith(
        1, // minutes floored
        "Write the spec",
        "Showed up and put in the time.", // win fallback
        3, // rating fallback
        "", // no done-criteria entered
      ),
    );
  });
});

describe("FocusView — localStorage resume", () => {
  it("resumes straight into the run stage when an active session is stored", () => {
    localStorage.setItem(
      "xp.focus.active",
      JSON.stringify({
        startedAt: Date.now(),
        durationMinutes: 60,
        intent: "Resumed deep work",
        done: "",
      }),
    );
    render(<FocusView entries={[]} />);
    // skips home/setup entirely
    expect(screen.queryByText("Your focus journal")).toBeNull();
    expect(screen.getByText("Resumed deep work")).toBeTruthy();
    expect(screen.getByLabelText("Pause")).toBeTruthy();
  });

  it("ignores malformed stored state and falls back to the journal", () => {
    localStorage.setItem("xp.focus.active", "{not json");
    render(<FocusView entries={[reflected]} />);
    expect(screen.getByText("Your focus journal")).toBeTruthy();
  });
});
