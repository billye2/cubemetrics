// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

vi.mock("@/app/app/skilltree/actions", () => ({
  addSkillAction: vi.fn(async () => {}),
  editSkillAction: vi.fn(async () => {}),
  deleteSkillAction: vi.fn(async () => {}),
  logPracticeAction: vi.fn(async () => {}),
  deletePracticeAction: vi.fn(async () => {}),
  addDepAction: vi.fn(async () => {}),
  deleteDepAction: vi.fn(async () => {}),
}));

import { SkillTreeView } from "@/app/app/skilltree/SkillTreeView";

const skills = [
  {
    id: 1, name: "Guitar", category: "Music", xp: 500, level: 5, maxed: false, locked: false,
    tier: 1, deps: [], practice: [], lastPracticedAt: null, idleDays: null, rusting: false,
  },
];
const stats = { accountLevel: 12, streak: 3, weekly: [], rustingCount: 0 };

beforeEach(() => cleanup());
afterEach(() => vi.unstubAllGlobals());

describe("SkillTreeView", () => {
  it("shows an account-level ring hero", () => {
    render(<SkillTreeView skills={skills} stats={stats} />);
    expect(screen.getByText("Account level 12")).toBeTruthy(); // ring hero (unique)
    expect(screen.getByText("Guitar")).toBeTruthy(); // skill still listed
  });
});
