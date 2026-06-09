// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, within, cleanup } from "@testing-library/react";

vi.mock("@/app/app/workout/actions", () => ({
  addSessionAction: vi.fn(async () => {}),
  deleteSessionAction: vi.fn(async () => {}),
  addSetAction: vi.fn(async () => {}),
  deleteSetAction: vi.fn(async () => {}),
}));

import { WorkoutView } from "@/app/app/workout/WorkoutView";

function dateAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toLocaleDateString("en-CA");
}

const sessions = [
  { id: 1, title: "Push day", performed_on: dateAgo(0), note: null, created_at: "2026-06-09T09:00:00Z", sets: [] },
  { id: 2, title: "Legs", performed_on: dateAgo(1), note: null, created_at: "2026-06-08T09:00:00Z", sets: [] },
];

function statCell(label: string | RegExp): HTMLElement {
  return screen.getByText(label).parentElement as HTMLElement;
}

beforeEach(() => cleanup());
afterEach(() => vi.unstubAllGlobals());

describe("WorkoutView — stat strip", () => {
  it("shows a workout streak (today + yesterday = 2)", () => {
    render(
      <WorkoutView
        sessions={sessions}
        prByExercise={{}}
        stats={{ weekSessions: 2, weekVolume: 5000, totalSessions: 10 }}
      />,
    );
    expect(within(statCell(/Streak/)).getByText("2")).toBeTruthy();
    expect(within(statCell(/Workouts/)).getByText("2")).toBeTruthy();
  });
});
