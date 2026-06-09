// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, within, cleanup, waitFor } from "@testing-library/react";

const { logTouch, deleteContact, setCadence } = vi.hoisted(() => ({
  addContact: vi.fn(async () => {}),
  deleteContact: vi.fn(async (_id: number) => {}),
  logTouch: vi.fn(async (_id: number) => {}),
  setCadence: vi.fn(async (_id: number, _d: number) => {}),
}));
vi.mock("@/app/app/keepintouch/actions", () => ({
  addContact: vi.fn(async () => {}),
  deleteContact,
  logTouch,
  setCadence,
}));

import { KeepInTouchView } from "@/app/app/keepintouch/KeepInTouchView";

const contacts = [
  { id: 1, name: "Alice", company: "Acme", cadenceDays: 30, status: "due" as const, label: "3 days overdue", dueIn: -3 },
  { id: 2, name: "Bob", company: null, cadenceDays: 7, status: "soon" as const, label: "due in 2 days", dueIn: 2 },
  { id: 3, name: "Cara", company: null, cadenceDays: 30, status: "ok" as const, label: "in 20 days", dueIn: 20 },
];

beforeEach(() => {
  vi.clearAllMocks();
  cleanup();
});
afterEach(() => vi.unstubAllGlobals());

describe("KeepInTouchView", () => {
  it("groups contacts into cadence-status sections + shows the due stat", () => {
    render(<KeepInTouchView contacts={contacts} />);
    expect(screen.getByText("Reach out now")).toBeTruthy();
    expect(screen.getByText("Coming up")).toBeTruthy();
    expect(screen.getByText("On track")).toBeTruthy();
    const dueCell = screen.getByText("Due now").parentElement as HTMLElement;
    expect(within(dueCell).getByText("1")).toBeTruthy();
  });

  it("logs a touch, changes cadence, and deletes", async () => {
    vi.stubGlobal("confirm", vi.fn(() => true));
    render(<KeepInTouchView contacts={contacts} />);
    const row = screen.getByText("Alice").closest("li") as HTMLElement;
    fireEvent.click(within(row).getByLabelText(/reached out to Alice/));
    await waitFor(() => expect(logTouch).toHaveBeenCalledWith(1));
    fireEvent.change(within(row).getByLabelText("Cadence for Alice"), { target: { value: "7" } });
    await waitFor(() => expect(setCadence).toHaveBeenCalledWith(1, 7));
    fireEvent.click(within(row).getByLabelText("Delete contact"));
    await waitFor(() => expect(deleteContact).toHaveBeenCalledWith(1));
  });
});
