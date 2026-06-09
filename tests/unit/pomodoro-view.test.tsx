// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

vi.mock("@/app/app/pomodoro/actions", () => ({
  startSessionAction: vi.fn(async () => {}),
  completeSessionAction: vi.fn(async () => {}),
  cancelSessionAction: vi.fn(async () => {}),
}));

import { PomodoroView } from "@/app/app/pomodoro/PomodoroView";

const week = [
  { short: "M", label: "Mon", count: 2, isToday: false },
  { short: "T", label: "Tue", count: 3, isToday: true },
];

beforeEach(() => {
  cleanup();
  localStorage.clear(); // default settings → daily goal 8
});
afterEach(() => vi.unstubAllGlobals());

describe("PomodoroView — goal ring", () => {
  it("shows progress toward the daily goal when below it", () => {
    render(<PomodoroView active={null} todayCount={3} recent={[]} week={week} />);
    expect(screen.getByText("3/8")).toBeTruthy(); // Today stat tile
    expect(screen.getByText("5 to your goal")).toBeTruthy();
    expect(screen.getByText("On track")).toBeTruthy();
  });

  it("celebrates when the daily goal is met", () => {
    render(<PomodoroView active={null} todayCount={8} recent={[]} week={week} />);
    expect(screen.getByText(/Daily goal complete/)).toBeTruthy();
    expect(screen.getByText("Complete")).toBeTruthy();
  });
});
