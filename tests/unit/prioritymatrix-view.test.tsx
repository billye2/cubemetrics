// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, within, cleanup, waitFor } from "@testing-library/react";

const { completeTask, deleteTask, setQuadrant } = vi.hoisted(() => ({
  addTask: vi.fn(async () => {}),
  completeTask: vi.fn(async (_id: number) => {}),
  deleteTask: vi.fn(async (_id: number) => {}),
  setQuadrant: vi.fn(async (_id: number, _q: number) => {}),
}));
vi.mock("@/app/app/prioritymatrix/actions", () => ({
  addTask: vi.fn(async () => {}),
  completeTask,
  deleteTask,
  setQuadrant,
}));

import { MatrixView } from "@/app/app/prioritymatrix/MatrixView";

const tasks = [
  { id: 1, title: "Triage me", quadrant: 0, created_at: "2026-06-01T00:00:00Z" },
  { id: 2, title: "Do me", quadrant: 1, created_at: "2026-06-01T00:00:00Z" },
  { id: 3, title: "Schedule me", quadrant: 2, created_at: "2026-06-01T00:00:00Z" },
];

beforeEach(() => {
  vi.clearAllMocks();
  cleanup();
});
afterEach(() => vi.unstubAllGlobals());

describe("MatrixView", () => {
  it("shows the triage stat tile", () => {
    render(<MatrixView tasks={tasks} />);
    const cell = screen.getByText("To triage").parentElement as HTMLElement;
    expect(within(cell).getByText("1")).toBeTruthy();
  });

  it("completes, moves and deletes a task", async () => {
    vi.stubGlobal("confirm", vi.fn(() => true));
    render(<MatrixView tasks={tasks} />);
    const row = screen.getByText("Triage me").closest("li") as HTMLElement;
    fireEvent.click(within(row).getByLabelText("Mark done"));
    await waitFor(() => expect(completeTask).toHaveBeenCalledWith(1));
    fireEvent.change(within(row).getByLabelText("Move to quadrant"), { target: { value: "1" } });
    await waitFor(() => expect(setQuadrant).toHaveBeenCalledWith(1, 1));
    fireEvent.click(within(row).getByLabelText("Delete task"));
    await waitFor(() => expect(deleteTask).toHaveBeenCalledWith(1));
  });
});
