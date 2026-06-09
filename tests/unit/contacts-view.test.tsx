// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, within, cleanup } from "@testing-library/react";

vi.mock("@/app/app/contacts/actions", () => ({
  addContact: vi.fn(async () => {}),
  addInteraction: vi.fn(async () => {}),
  deleteContact: vi.fn(async () => {}),
  deleteInteraction: vi.fn(async () => {}),
  updateContact: vi.fn(async () => {}),
}));

import { ContactsView } from "@/app/app/contacts/ContactsView";

const base = { email: null, phone: null, company: null, note: null, birthday: null, createdAt: "2026-01-01T00:00:00Z" };
const contacts = [
  { id: 1, name: "Alice", tags: ["friend"], cadenceDays: 30, lastContacted: "2026-01-01", status: "due" as const, dueIn: -5, cadenceLabel: "5 days overdue", ...base },
  { id: 2, name: "Bob", tags: [], cadenceDays: 30, lastContacted: "2026-06-08", status: "ok" as const, dueIn: 25, cadenceLabel: "in 25 days", ...base },
];

function statCell(label: string): HTMLElement {
  return screen.getByText(label).parentElement as HTMLElement;
}

beforeEach(() => cleanup());
afterEach(() => vi.unstubAllGlobals());

describe("ContactsView", () => {
  it("shows a caught-up ring hero + stat strip", () => {
    render(<ContactsView contacts={contacts} logs={[]} />);
    expect(screen.getByText("1 person to reach out to")).toBeTruthy();
    expect(within(statCell("People")).getByText("2")).toBeTruthy();
    expect(within(statCell("Reach out")).getByText("1")).toBeTruthy();
  });
});
