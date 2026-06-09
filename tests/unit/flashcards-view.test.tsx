// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, within, cleanup, waitFor } from "@testing-library/react";

const { deleteCardAction } = vi.hoisted(() => ({
  addCardAction: vi.fn(async () => {}),
  deleteCardAction: vi.fn(async (_id: number) => {}),
  reviewCardAction: vi.fn(async () => {}),
}));
vi.mock("@/app/app/flashcards/actions", () => ({
  addCardAction: vi.fn(async () => {}),
  deleteCardAction,
  reviewCardAction: vi.fn(async () => {}),
}));

import { FlashcardsView } from "@/app/app/flashcards/FlashcardsView";

const today = "2026-06-09";
const cards = [
  { id: 1, deck: "General", front: "Q1", back: "A1", ease: 2.5, interval: 1, reps: 1, due_date: "2026-06-01", created_at: "2026-05-01T00:00:00Z" },
  { id: 2, deck: "General", front: "Q2", back: "A2", ease: 2.6, interval: 30, reps: 5, due_date: "2026-06-25", created_at: "2026-05-01T00:00:00Z" },
];

beforeEach(() => {
  vi.clearAllMocks();
  cleanup();
});
afterEach(() => vi.unstubAllGlobals());

describe("FlashcardsView", () => {
  it("shows a mastered ring + deck list", () => {
    render(<FlashcardsView cards={cards} today={today} dueCount={1} mastered={1} />);
    expect(screen.getByText("1 of 2 mastered")).toBeTruthy();
    expect(screen.getByText(/General/)).toBeTruthy();
  });

  it("starts a study session for due cards", () => {
    render(<FlashcardsView cards={cards} today={today} dueCount={1} mastered={1} />);
    fireEvent.click(screen.getByRole("button", { name: /Study 1 due card/ }));
    expect(screen.getByText("tap to flip")).toBeTruthy();
  });

  it("deletes a card", async () => {
    vi.stubGlobal("confirm", vi.fn(() => true));
    render(<FlashcardsView cards={cards} today={today} dueCount={1} mastered={1} />);
    const row = screen.getByText("Q1").closest("li") as HTMLElement;
    fireEvent.click(within(row).getByText("×"));
    await waitFor(() => expect(deleteCardAction).toHaveBeenCalledWith(1));
  });
});
