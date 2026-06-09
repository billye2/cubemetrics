// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, within, cleanup, waitFor } from "@testing-library/react";

const { triageToTodo, dismissItem } = vi.hoisted(() => ({
  captureItem: vi.fn(async () => {}),
  dismissItem: vi.fn(async (_id: number) => {}),
  triageToBacklog: vi.fn(async () => {}),
  triageToNote: vi.fn(async () => {}),
  triageToTodo: vi.fn(async (_id: number) => {}),
}));
vi.mock("@/app/app/inbox/actions", () => ({
  captureItem: vi.fn(async () => {}),
  dismissItem,
  triageToBacklog: vi.fn(async () => {}),
  triageToNote: vi.fn(async () => {}),
  triageToTodo,
}));

import { InboxView } from "@/app/app/inbox/InboxView";

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

const items = [
  { id: 1, text: "Fresh thought", created_at: isoDaysAgo(0), age: "just now" },
  { id: 2, text: "Midweek idea", created_at: isoDaysAgo(3), age: "3d" },
  { id: 3, text: "Ancient note", created_at: isoDaysAgo(20), age: "20d" },
];

beforeEach(() => {
  vi.clearAllMocks();
  cleanup();
});
afterEach(() => vi.unstubAllGlobals());

describe("InboxView", () => {
  it("shows the inbox-zero state with no items", () => {
    render(<InboxView items={[]} oldest={null} />);
    expect(screen.getByText("Inbox zero")).toBeTruthy();
  });

  it("groups items into age buckets", () => {
    render(<InboxView items={items} oldest="20d" />);
    expect(screen.getByText("Today")).toBeTruthy();
    expect(screen.getByText("This week")).toBeTruthy();
    expect(screen.getByText("Older")).toBeTruthy();
    expect(within(screen.getByText("To process").parentElement as HTMLElement).getByText("3")).toBeTruthy();
  });

  it("triages and dismisses an item", async () => {
    render(<InboxView items={items} oldest="20d" />);
    const row = screen.getByText("Fresh thought").closest("li") as HTMLElement;
    fireEvent.click(within(row).getByRole("button", { name: "→ Todo" }));
    await waitFor(() => expect(triageToTodo).toHaveBeenCalledWith(1));
    fireEvent.click(within(row).getByLabelText("Dismiss"));
    await waitFor(() => expect(dismissItem).toHaveBeenCalledWith(1));
  });
});
