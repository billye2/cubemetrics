// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, within, cleanup, waitFor } from "@testing-library/react";

const { scheduleDoneAction, scheduleDeleteAction } = vi.hoisted(() => ({
  scheduleAddAction: vi.fn(async () => {}),
  scheduleDeleteAction: vi.fn(async (_a: string, _id: number) => {}),
  scheduleDoneAction: vi.fn(async (_a: string, _id: number) => {}),
  scheduleSetIntervalAction: vi.fn(async () => {}),
}));
vi.mock("@/app/app/_factories/actions", () => ({
  scheduleAddAction: vi.fn(async () => {}),
  scheduleDeleteAction,
  scheduleDoneAction,
  scheduleSetIntervalAction: vi.fn(async () => {}),
}));

import { ScheduleView } from "@/app/app/_factories/ScheduleView";
import type { FactoryConfig } from "@/lib/modern/catalog";

const config = { scheduleType: "maintenance", itemLabel: "Task" } as FactoryConfig;
const APP = "maintenance";

function dateAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toLocaleDateString("en-CA");
}

const items = [
  { id: 1, title: "Oil change", interval_days: 7, last_done: dateAgo(30), note: null, created_at: "2026-06-01T00:00:00Z" }, // overdue → due now
  { id: 2, title: "Vacuum", interval_days: 30, last_done: dateAgo(27), note: null, created_at: "2026-06-01T00:00:00Z" }, // ~3 days → this week
  { id: 3, title: "Deep clean", interval_days: 30, last_done: dateAgo(0), note: null, created_at: "2026-06-01T00:00:00Z" }, // 30 days → scheduled
];

beforeEach(() => {
  vi.clearAllMocks();
  cleanup();
});
afterEach(() => vi.unstubAllGlobals());

describe("ScheduleView — status bucketing", () => {
  it("groups items into Due now / This week / Scheduled sections", () => {
    render(<ScheduleView appId={APP} config={config} items={items} />);
    expect(screen.getByText("Due now")).toBeTruthy();
    expect(screen.getByText("This week")).toBeTruthy();
    expect(screen.getByText("Scheduled")).toBeTruthy();
  });

  it("shows the all-caught-up hero when nothing is due", () => {
    const caughtUp = [
      { id: 5, title: "Recently done", interval_days: 30, last_done: dateAgo(0), note: null, created_at: "2026-06-01T00:00:00Z" },
    ];
    render(<ScheduleView appId={APP} config={config} items={caughtUp} />);
    expect(screen.getByText("All caught up")).toBeTruthy();
  });

  it("marks an item done and deletes another", async () => {
    vi.stubGlobal("confirm", vi.fn(() => true));
    render(<ScheduleView appId={APP} config={config} items={items} />);
    fireEvent.click(screen.getByLabelText("Mark Oil change done today"));
    await waitFor(() => expect(scheduleDoneAction).toHaveBeenCalledWith(APP, 1));
    const row = screen.getByText("Vacuum").closest("li") as HTMLElement;
    fireEvent.click(within(row).getByLabelText("Delete"));
    await waitFor(() => expect(scheduleDeleteAction).toHaveBeenCalledWith(APP, 2));
  });
});
