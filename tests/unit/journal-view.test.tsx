// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, within, cleanup, waitFor } from "@testing-library/react";

const { deleteEntryAction, updateEntryAction } = vi.hoisted(() => ({
  deleteEntryAction: vi.fn(async (_id: number) => {}),
  updateEntryAction: vi.fn(
    async (_id: number, _title: string, _body: string, _mood: string | null) => {},
  ),
}));
vi.mock("@/app/app/journal/actions", () => ({ deleteEntryAction, updateEntryAction }));

import { JournalView } from "@/app/app/journal/JournalView";

// YYYY-MM-DD key N days before today, in local time (matches the component).
function dateKey(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}
const CREATED = new Date().toISOString();

// today, yesterday, 2-days-ago (consecutive → streak 3) + one 40 days back.
const entries = [
  { id: 1, title: null, body: "Alpha entry", mood: "😊", entry_date: dateKey(0), created_at: CREATED },
  { id: 2, title: "Bravo title", body: "Bravo entry", mood: "😌", entry_date: dateKey(1), created_at: CREATED },
  { id: 3, title: null, body: "Charlie entry", mood: "😊", entry_date: dateKey(2), created_at: CREATED },
  { id: 4, title: null, body: "Delta entry", mood: "😐", entry_date: dateKey(40), created_at: CREATED },
];

// Expected "this month" count, computed the same way the component does.
function expectedThisMonth(): number {
  const now = new Date();
  const prefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  return entries.filter((e) => e.entry_date.startsWith(prefix)).length;
}

function statCell(label: string): HTMLElement {
  return screen.getByText(label).parentElement as HTMLElement;
}
function cardOf(bodyText: string): HTMLElement {
  return screen.getByText(bodyText).closest("li") as HTMLElement;
}

beforeEach(() => {
  vi.clearAllMocks();
  cleanup();
});
afterEach(() => vi.unstubAllGlobals());

describe("JournalView — overview", () => {
  it("shows the empty state with no entries", () => {
    render(<JournalView entries={[]} />);
    expect(screen.getByText("No entries yet.")).toBeTruthy();
  });

  it("renders the stats header (count, this-month, consecutive-day streak)", () => {
    render(<JournalView entries={entries} />);
    expect(within(statCell("entries")).getByText("4")).toBeTruthy();
    expect(within(statCell("this month")).getByText(String(expectedThisMonth()))).toBeTruthy();
    // today + yesterday + 2-days-ago are consecutive → streak 3
    expect(within(statCell("day streak")).getByText("3")).toBeTruthy();
  });

  it("lists all entries by default", () => {
    render(<JournalView entries={entries} />);
    ["Alpha entry", "Bravo entry", "Charlie entry", "Delta entry"].forEach((t) =>
      expect(screen.getByText(t)).toBeTruthy(),
    );
  });
});

describe("JournalView — filtering", () => {
  it("filters by search query over title and body", () => {
    render(<JournalView entries={entries} />);
    fireEvent.change(screen.getByPlaceholderText("Search entries…"), {
      target: { value: "bravo" },
    });
    expect(screen.getByText("Bravo entry")).toBeTruthy();
    expect(screen.queryByText("Alpha entry")).toBeNull();
  });

  it("filters by a mood chip and toggles it back off", () => {
    render(<JournalView entries={entries} />);
    // 😊 is used by Alpha + Charlie
    fireEvent.click(screen.getByLabelText("Filter by mood 😊"));
    expect(screen.getByText("Alpha entry")).toBeTruthy();
    expect(screen.getByText("Charlie entry")).toBeTruthy();
    expect(screen.queryByText("Bravo entry")).toBeNull();

    // clicking the active chip clears the filter
    fireEvent.click(screen.getByLabelText("Filter by mood 😊"));
    expect(screen.getByText("Bravo entry")).toBeTruthy();
  });

  it("shows a no-match message when filters exclude everything", () => {
    render(<JournalView entries={entries} />);
    fireEvent.change(screen.getByPlaceholderText("Search entries…"), {
      target: { value: "zzzzz" },
    });
    expect(screen.getByText(/No entries match your filters/)).toBeTruthy();
  });
});

describe("JournalView — entry actions", () => {
  it("edits an entry body and saves via the action", async () => {
    render(<JournalView entries={entries} />);
    const card = cardOf("Alpha entry");
    fireEvent.click(within(card).getByLabelText("Edit entry"));
    fireEvent.change(within(card).getByPlaceholderText("Write…"), {
      target: { value: "Alpha edited" },
    });
    fireEvent.click(within(card).getByRole("button", { name: "Save" }));
    await waitFor(() =>
      expect(updateEntryAction).toHaveBeenCalledWith(1, "", "Alpha edited", "😊"),
    );
  });

  it("deletes when confirmed and not when dismissed", async () => {
    vi.stubGlobal("confirm", vi.fn(() => false));
    render(<JournalView entries={entries} />);
    fireEvent.click(within(cardOf("Bravo entry")).getByLabelText("Delete"));
    expect(deleteEntryAction).not.toHaveBeenCalled();

    vi.stubGlobal("confirm", vi.fn(() => true));
    fireEvent.click(within(cardOf("Bravo entry")).getByLabelText("Delete"));
    await waitFor(() => expect(deleteEntryAction).toHaveBeenCalledWith(2));
  });
});
