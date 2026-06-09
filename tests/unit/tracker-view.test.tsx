// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, within, cleanup, waitFor } from "@testing-library/react";

const { trackerUpdateAction, trackerDeleteAction } = vi.hoisted(() => ({
  trackerAddAction: vi.fn(async () => {}),
  trackerDeleteAction: vi.fn(async (_a: string, _id: number) => {}),
  trackerUpdateAction: vi.fn(async (_a: string, _id: number, _v: number, _n: string) => {}),
}));
vi.mock("@/app/app/_factories/actions", () => ({
  trackerAddAction: vi.fn(async () => {}),
  trackerDeleteAction,
  trackerUpdateAction,
}));

import { TrackerView } from "@/app/app/_factories/TrackerView";
import type { FactoryConfig } from "@/lib/modern/catalog";

const config = { trackerType: "water", aggregate: "sum", unit: "glasses" } as FactoryConfig;
const NOW = new Date().toISOString();
const entries = [
  { id: 1, value: 3, note: "morning", created_at: NOW, entry_date: NOW.slice(0, 10) },
];

beforeEach(() => {
  vi.clearAllMocks();
  cleanup();
});
afterEach(() => vi.unstubAllGlobals());

describe("TrackerView — inline entry edit", () => {
  it("edits a logged entry's value via the new update action", async () => {
    render(<TrackerView appId="water" config={config} entries={entries} />);
    fireEvent.click(screen.getByLabelText("Edit entry"));
    const saveBtn = screen.getByRole("button", { name: "Save" });
    const row = saveBtn.closest("li") as HTMLElement;
    fireEvent.change(within(row).getByRole("spinbutton"), { target: { value: "5" } });
    fireEvent.click(saveBtn);
    await waitFor(() => expect(trackerUpdateAction).toHaveBeenCalledWith("water", 1, 5, "morning"));
  });

  it("deletes a logged entry", async () => {
    vi.stubGlobal("confirm", vi.fn(() => true));
    render(<TrackerView appId="water" config={config} entries={entries} />);
    fireEvent.click(screen.getByLabelText("Delete entry"));
    await waitFor(() => expect(trackerDeleteAction).toHaveBeenCalledWith("water", 1));
  });
});
