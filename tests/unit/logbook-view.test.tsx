// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, within, cleanup, waitFor } from "@testing-library/react";

const { logbookAddAction, logbookDeleteAction } = vi.hoisted(() => ({
  logbookAddAction: vi.fn(async (_a: string, _t: string, _title: string, _body: string, _at: string | null) => {}),
  logbookUpdateAction: vi.fn(async () => {}),
  logbookDeleteAction: vi.fn(async (_a: string, _id: number) => {}),
}));
vi.mock("@/app/app/_factories/actions", () => ({
  logbookAddAction,
  logbookUpdateAction: vi.fn(async () => {}),
  logbookDeleteAction,
}));
vi.mock("@/app/app/_factories/markdown", () => ({
  renderMarkdown: (s: string) => <p>{s}</p>,
}));

import { LogbookView } from "@/app/app/_factories/LogbookView";
import type { FactoryConfig } from "@/lib/modern/catalog";

const config = { logType: "gratitude", entryLabel: "Entry", hasTitle: false } as FactoryConfig;
const APP = "gratitude";

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(9, 0, 0, 0);
  return d.toISOString();
}

const entries = [
  { id: 1, title: null, body: "Grateful for coffee", created_at: isoDaysAgo(0) },
  { id: 2, title: null, body: "Grateful for sun", created_at: isoDaysAgo(1) },
  { id: 3, title: null, body: "Older entry", created_at: isoDaysAgo(10) },
];

function statCell(label: string | RegExp): HTMLElement {
  return screen.getByText(label).parentElement as HTMLElement;
}

beforeEach(() => {
  vi.clearAllMocks();
  cleanup();
});
afterEach(() => vi.unstubAllGlobals());

describe("LogbookView — stat strip", () => {
  it("shows Total, This week, and a consecutive-day Streak", () => {
    render(<LogbookView appId={APP} config={config} entries={entries} />);
    expect(within(statCell("Total")).getByText("3")).toBeTruthy();
    // today + yesterday are consecutive → streak 2
    expect(within(statCell(/Streak/)).getByText("2")).toBeTruthy();
  });

  it("hides the strip when there are no entries", () => {
    render(<LogbookView appId={APP} config={config} entries={[]} />);
    expect(screen.queryByText("Total")).toBeNull();
    expect(screen.getByText("No entries yet.")).toBeTruthy();
  });
});

describe("LogbookView — actions", () => {
  it("adds an entry", async () => {
    render(<LogbookView appId={APP} config={config} entries={entries} />);
    fireEvent.click(screen.getByRole("button", { name: /New entry/ }));
    fireEvent.change(screen.getByPlaceholderText(/grateful/i), { target: { value: "New gratitude" } });
    const form = screen.getByPlaceholderText(/grateful/i).closest("form") as HTMLFormElement;
    fireEvent.submit(form);
    await waitFor(() => expect(logbookAddAction).toHaveBeenCalled());
    expect(logbookAddAction.mock.calls[0][3]).toBe("New gratitude");
  });

  it("deletes an entry", async () => {
    vi.stubGlobal("confirm", vi.fn(() => true));
    render(<LogbookView appId={APP} config={config} entries={entries} />);
    const card = screen.getByText("Grateful for coffee").closest("li") as HTMLElement;
    fireEvent.click(within(card).getByRole("button", { name: "×" }));
    await waitFor(() => expect(logbookDeleteAction).toHaveBeenCalledWith(APP, 1));
  });
});
