// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, within, cleanup } from "@testing-library/react";

vi.mock("@/app/app/weeklyreview/actions", () => ({
  saveReview: vi.fn(async () => {}),
  deleteReview: vi.fn(async () => {}),
}));
vi.mock("next/link", () => ({ default: ({ children }: { children: React.ReactNode }) => <>{children}</> }));

import { WeeklyReviewView } from "@/app/app/weeklyreview/WeeklyReviewView";

const stats = { habitsCompleted: 5, focusMinutes: 120, todosDone: 8, trackedMinutes: 300 };

function statCell(label: string): HTMLElement {
  return screen.getByText(label).parentElement as HTMLElement;
}

beforeEach(() => cleanup());
afterEach(() => vi.unstubAllGlobals());

describe("WeeklyReviewView", () => {
  it("renders the StatTile week-stats header", () => {
    render(
      <WeeklyReviewView
        weekStartISO="2026-06-08"
        prevWeekISO="2026-06-01"
        nextWeekISO={null}
        isCurrentWeek
        review={null}
        prevReview={null}
        stats={stats}
      />,
    );
    expect(within(statCell("Habits")).getByText("5")).toBeTruthy();
    expect(within(statCell("Todos")).getByText("8")).toBeTruthy();
    // with no review yet, it opens in edit mode with the section prompts
    expect(screen.getByText("Wins")).toBeTruthy();
    expect(screen.getByText("Next-week focus")).toBeTruthy();
  });
});
