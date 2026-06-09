// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

vi.mock("@/app/app/okr/actions", () => ({
  addKeyResult: vi.fn(async () => {}),
  addObjective: vi.fn(async () => {}),
  carryOverKeyResult: vi.fn(async () => {}),
  deleteKeyResult: vi.fn(async () => {}),
  deleteObjective: vi.fn(async () => {}),
  gradeObjective: vi.fn(async () => {}),
  reopenObjective: vi.fn(async () => {}),
  setConfidence: vi.fn(async () => {}),
  setCycle: vi.fn(async () => {}),
  setKeyResultTitle: vi.fn(async () => {}),
  setKeyResultValue: vi.fn(async () => {}),
  setObjectiveTitle: vi.fn(async () => {}),
  updateKeyResult: vi.fn(async () => {}),
}));

import { OkrView } from "@/app/app/okr/OkrView";

const objectives = [
  {
    id: 1, title: "Grow revenue", cycle: "2026 Q2", confidence: "on_track" as const, status: "active" as const,
    reflection: "",
    key_results: [
      { id: 1, title: "MRR", kr_type: "metric" as const, start_value: 0, current_value: 5, target_value: 10, sort_order: 0, history: [] },
    ],
  },
];

beforeEach(() => cleanup());
afterEach(() => vi.unstubAllGlobals());

describe("OkrView", () => {
  it("shows the cycle-attainment ring dashboard with status pills", () => {
    render(<OkrView objectives={objectives} />);
    expect(screen.getByText("1 on track")).toBeTruthy(); // confidence pill
    expect(screen.getByText("Grow revenue")).toBeTruthy(); // objective still listed
  });
});
