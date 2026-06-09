// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, within, cleanup, waitFor } from "@testing-library/react";

const { deleteCard } = vi.hoisted(() => ({
  addImageCard: vi.fn(async () => {}),
  addQuoteCard: vi.fn(async () => {}),
  deleteCard: vi.fn(async (_id: number) => {}),
}));
vi.mock("@/app/app/visionboard/actions", () => ({
  addImageCard: vi.fn(async () => {}),
  addQuoteCard: vi.fn(async () => {}),
  deleteCard,
}));

import { VisionBoardView } from "@/app/app/visionboard/VisionBoardView";

const cards = [
  { id: 1, kind: "quote" as const, text: "Dream big", imageUrl: null, section: "" },
  { id: 2, kind: "quote" as const, text: "Stay focused", imageUrl: null, section: "" },
  { id: 3, kind: "image" as const, text: null, imageUrl: "https://x/y.jpg", section: "" },
];

function statCell(label: string): HTMLElement {
  return screen.getByText(label).parentElement as HTMLElement;
}

beforeEach(() => {
  vi.clearAllMocks();
  cleanup();
});
afterEach(() => vi.unstubAllGlobals());

describe("VisionBoardView", () => {
  it("shows a board-composition stat strip", () => {
    render(<VisionBoardView cards={cards} />);
    expect(within(statCell("Cards")).getByText("3")).toBeTruthy();
    expect(within(statCell("Quotes")).getByText("2")).toBeTruthy();
    expect(within(statCell("Images")).getByText("1")).toBeTruthy();
  });

  it("removes a card", async () => {
    vi.stubGlobal("confirm", vi.fn(() => true));
    render(<VisionBoardView cards={cards} />);
    const tile = screen.getByText("Dream big").closest(".group") as HTMLElement;
    fireEvent.click(within(tile).getByLabelText("Remove card"));
    await waitFor(() => expect(deleteCard).toHaveBeenCalledWith(1));
  });
});
