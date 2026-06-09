// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, within, cleanup, waitFor } from "@testing-library/react";

const { addCard, deleteCard, moveCard } = vi.hoisted(() => ({
  addCard: vi.fn(async (_lane: string, _title: string) => {}),
  deleteCard: vi.fn(async (_id: number) => {}),
  moveCard: vi.fn(async (_id: number, _lane: string) => {}),
}));
vi.mock("@/app/app/kanban/actions", () => ({ addCard, deleteCard, moveCard }));

import { KanbanView } from "@/app/app/kanban/KanbanView";

const cards = [
  { id: 1, lane: "todo", title: "Write spec", sort_order: 0, created_at: "2026-06-01T00:00:00Z" },
  { id: 2, lane: "doing", title: "Build it", sort_order: 0, created_at: "2026-06-01T00:00:00Z" },
  { id: 3, lane: "done", title: "Ship it", sort_order: 0, created_at: "2026-06-01T00:00:00Z" },
];

beforeEach(() => {
  vi.clearAllMocks();
  cleanup();
});
afterEach(() => vi.unstubAllGlobals());

describe("KanbanView", () => {
  it("shows a done-ratio ring and per-lane counts", () => {
    render(<KanbanView cards={cards} />);
    expect(screen.getByText("33%")).toBeTruthy(); // 1 of 3 done
    expect(screen.getByText("1 of 3 done")).toBeTruthy();
    // "Done" stat label appears in the strip (column headers use "To do"/"Doing"/"Done"
    // too, so assert the strip count tile via its uppercase label class)
    const doneTile = screen.getAllByText("Done").find((el) => el.className.includes("text-[10px]"))!;
    expect(within(doneTile.parentElement as HTMLElement).getByText("1")).toBeTruthy();
  });

  it("celebrates when every card is done", () => {
    render(<KanbanView cards={cards.map((c) => ({ ...c, lane: "done" }))} />);
    expect(screen.getByText(/Board clear/)).toBeTruthy();
  });

  it("moves and deletes a card", async () => {
    vi.stubGlobal("confirm", vi.fn(() => true));
    render(<KanbanView cards={cards} />);
    const row = screen.getByText("Write spec").closest("li") as HTMLElement;
    fireEvent.click(within(row).getByLabelText("Move right"));
    await waitFor(() => expect(moveCard).toHaveBeenCalledWith(1, "doing"));
    fireEvent.click(within(row).getByLabelText("Delete card"));
    await waitFor(() => expect(deleteCard).toHaveBeenCalledWith(1));
  });
});
