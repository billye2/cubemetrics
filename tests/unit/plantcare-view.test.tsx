// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, within, cleanup, waitFor } from "@testing-library/react";

const { waterPlant, deletePlant } = vi.hoisted(() => ({
  addPlant: vi.fn(async () => {}),
  deletePlant: vi.fn(async (_id: number) => {}),
  fertilizePlant: vi.fn(async () => {}),
  getWateringHistory: vi.fn(async () => [] as string[]),
  removePlantPhoto: vi.fn(async () => {}),
  setFertilizeSchedule: vi.fn(async () => {}),
  updatePlant: vi.fn(async () => {}),
  uploadPlantPhoto: vi.fn(async () => undefined),
  waterPlant: vi.fn(async (_id: number) => {}),
}));
vi.mock("@/app/app/plantcare/actions", () => ({
  addPlant: vi.fn(async () => {}),
  deletePlant,
  fertilizePlant: vi.fn(async () => {}),
  getWateringHistory: vi.fn(async () => []),
  removePlantPhoto: vi.fn(async () => {}),
  setFertilizeSchedule: vi.fn(async () => {}),
  updatePlant: vi.fn(async () => {}),
  uploadPlantPhoto: vi.fn(async () => undefined),
  waterPlant,
}));

import { PlantcareView } from "@/app/app/plantcare/PlantcareView";

const noFert = { enabled: false, status: null, label: "", frequencyDays: null, lastFertilized: null, nextDue: null, daysUntil: null };
const plants = [
  { id: 1, name: "Monstera", status: "overdue" as const, label: "2 days overdue", daysUntil: -2, frequencyDays: 7, light: "medium" as const, note: "", photoUrl: null, lastWatered: "2026-06-01", nextDue: "2026-06-07", fertilize: noFert },
  { id: 2, name: "Cactus", status: "upcoming" as const, label: "in 5 days", daysUntil: 5, frequencyDays: 30, light: "bright" as const, note: "", photoUrl: null, lastWatered: "2026-06-05", nextDue: "2026-07-05", fertilize: noFert },
];

beforeEach(() => {
  vi.clearAllMocks();
  cleanup();
});
afterEach(() => vi.unstubAllGlobals());

describe("PlantcareView", () => {
  it("shows a watered-health ring + stat strip", () => {
    render(<PlantcareView plants={plants} />);
    // 1 of 2 needs water → hero shows the count
    expect(screen.getByText("1 plant needs water")).toBeTruthy();
    const cell = screen.getByText("Plants").parentElement as HTMLElement;
    expect(within(cell).getByText("2")).toBeTruthy();
  });

  it("waters and deletes a plant from the Needs-water tab", async () => {
    vi.stubGlobal("confirm", vi.fn(() => true));
    render(<PlantcareView plants={plants} />);
    const row = screen.getByText("Monstera").closest("li") as HTMLElement;
    fireEvent.click(within(row).getByRole("button", { name: /Water/ }));
    await waitFor(() => expect(waterPlant).toHaveBeenCalledWith(1));
    fireEvent.click(within(row).getByLabelText("Delete Monstera"));
    await waitFor(() => expect(deletePlant).toHaveBeenCalledWith(1));
  });
});
