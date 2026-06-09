// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, within, cleanup, waitFor } from "@testing-library/react";

const { deleteWordAction } = vi.hoisted(() => ({
  addWordAction: vi.fn(async () => {}),
  deleteWordAction: vi.fn(async (_id: number) => {}),
  reviewWordAction: vi.fn(async () => {}),
}));
vi.mock("@/app/app/vocabulary/actions", () => ({
  addWordAction: vi.fn(async () => {}),
  deleteWordAction,
  reviewWordAction: vi.fn(async () => {}),
}));

import { VocabularyView } from "@/app/app/vocabulary/VocabularyView";

const today = "2026-06-09";
const words = [
  { id: 1, word: "alpha", definition: "first", example: null, ease: 2.5, interval: 1, reps: 1, due_date: "2026-06-01", created_at: "2026-05-01T00:00:00Z" },
  { id: 2, word: "beta", definition: "second", example: null, ease: 2.5, interval: 4, reps: 1, due_date: "2026-06-20", created_at: "2026-05-01T00:00:00Z" },
  { id: 3, word: "gamma", definition: "third", example: null, ease: 2.6, interval: 30, reps: 5, due_date: "2026-06-25", created_at: "2026-05-01T00:00:00Z" },
];

beforeEach(() => {
  vi.clearAllMocks();
  cleanup();
});
afterEach(() => vi.unstubAllGlobals());

describe("VocabularyView", () => {
  it("shows a mastered ring + status-bucketed word list", () => {
    render(<VocabularyView words={words} today={today} dueCount={1} mastered={1} />);
    expect(screen.getByText("1 of 3 mastered")).toBeTruthy();
    expect(screen.getByText("Due for review")).toBeTruthy(); // bucket header (unique)
    expect(screen.getByText("alpha")).toBeTruthy(); // the due word listed
  });

  it("starts a review session for due words", () => {
    render(<VocabularyView words={words} today={today} dueCount={1} mastered={1} />);
    fireEvent.click(screen.getByRole("button", { name: /Review 1 word due/ }));
    expect(screen.getByText("tap to reveal")).toBeTruthy();
  });

  it("deletes a word", async () => {
    vi.stubGlobal("confirm", vi.fn(() => true));
    render(<VocabularyView words={words} today={today} dueCount={1} mastered={1} />);
    const row = screen.getByText("alpha").closest("li") as HTMLElement;
    fireEvent.click(within(row).getByText("×"));
    await waitFor(() => expect(deleteWordAction).toHaveBeenCalledWith(1));
  });
});
