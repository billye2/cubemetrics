// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, within, cleanup, waitFor } from "@testing-library/react";

const { addNoteAction, deleteNoteAction, togglePinAction, updateNoteAction } = vi.hoisted(() => ({
  addNoteAction: vi.fn(async (_fd: FormData) => {}),
  deleteNoteAction: vi.fn(async (_id: number) => {}),
  togglePinAction: vi.fn(async (_id: number, _pinned: boolean) => {}),
  updateNoteAction: vi.fn(async (_id: number, _title: string, _body: string) => {}),
}));
vi.mock("@/app/app/notes/actions", () => ({
  addNoteAction,
  deleteNoteAction,
  togglePinAction,
  updateNoteAction,
}));

import { NotesView } from "@/app/app/notes/NotesView";

const NOW = new Date().toISOString();
const notes = [
  { id: 1, title: "Pinned one", body: "Alpha body", pinned: true, updated_at: NOW },
  { id: 2, title: null, body: "Bravo body", pinned: false, updated_at: NOW },
  { id: 3, title: "Charlie", body: "Charlie body", pinned: false, updated_at: NOW },
  { id: 4, title: null, body: "Delta body", pinned: false, updated_at: NOW },
];

function cardOf(text: string): HTMLElement {
  return screen.getByText(text).closest("li") as HTMLElement;
}

beforeEach(() => {
  vi.clearAllMocks();
  cleanup();
});
afterEach(() => vi.unstubAllGlobals());

describe("NotesView — list & sections", () => {
  it("shows the empty state with no notes", () => {
    render(<NotesView notes={[]} />);
    expect(screen.getByText("No notes yet.")).toBeTruthy();
  });

  it("splits notes into Pinned and Other sections", () => {
    render(<NotesView notes={notes} />);
    expect(screen.getByText("Pinned")).toBeTruthy();
    expect(screen.getByText("Other")).toBeTruthy();
    expect(within(cardOf("Alpha body")).getByLabelText("Unpin")).toBeTruthy();
    expect(within(cardOf("Bravo body")).getByLabelText("Pin")).toBeTruthy();
  });

  it("filters by search over title and body", () => {
    render(<NotesView notes={notes} />);
    fireEvent.change(screen.getByPlaceholderText("Search notes…"), {
      target: { value: "charlie" },
    });
    expect(screen.getByText("Charlie body")).toBeTruthy();
    expect(screen.queryByText("Alpha body")).toBeNull();
  });
});

describe("NotesView — new note form", () => {
  it("opens the form and submits a new note", async () => {
    render(<NotesView notes={notes} />);
    fireEvent.click(screen.getByRole("button", { name: "+ New note" }));
    fireEvent.change(screen.getByPlaceholderText("Note…"), { target: { value: "Fresh note" } });
    const form = screen.getByPlaceholderText("Note…").closest("form") as HTMLFormElement;
    fireEvent.submit(form);
    await waitFor(() => expect(addNoteAction).toHaveBeenCalledTimes(1));
    const fd = addNoteAction.mock.calls[0][0] as FormData;
    expect(fd.get("body")).toBe("Fresh note");
  });
});

describe("NotesView — card actions", () => {
  it("pins an unpinned note and unpins a pinned one", async () => {
    render(<NotesView notes={notes} />);
    fireEvent.click(within(cardOf("Bravo body")).getByLabelText("Pin"));
    await waitFor(() => expect(togglePinAction).toHaveBeenCalledWith(2, true));

    fireEvent.click(within(cardOf("Alpha body")).getByLabelText("Unpin"));
    await waitFor(() => expect(togglePinAction).toHaveBeenCalledWith(1, false));
  });

  it("edits a note body and shows the live character count", async () => {
    render(<NotesView notes={notes} />);
    const card = cardOf("Bravo body");
    fireEvent.click(within(card).getByLabelText("Edit note"));
    const textarea = within(card).getByPlaceholderText("Note…");
    fireEvent.change(textarea, { target: { value: "Bravo edited" } });
    expect(within(card).getByText("12 characters")).toBeTruthy();
    fireEvent.click(within(card).getByRole("button", { name: "Save" }));
    await waitFor(() => expect(updateNoteAction).toHaveBeenCalledWith(2, "", "Bravo edited"));
  });

  it("deletes a note when confirmed, not when dismissed", async () => {
    vi.stubGlobal("confirm", vi.fn(() => false));
    render(<NotesView notes={notes} />);
    fireEvent.click(within(cardOf("Charlie body")).getByRole("button", { name: "×" }));
    expect(deleteNoteAction).not.toHaveBeenCalled();

    vi.stubGlobal("confirm", vi.fn(() => true));
    fireEvent.click(within(cardOf("Charlie body")).getByRole("button", { name: "×" }));
    await waitFor(() => expect(deleteNoteAction).toHaveBeenCalledWith(3));
  });

  it("copies a note's title and body to the clipboard", async () => {
    const writeText = vi.fn();
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    render(<NotesView notes={notes} />);
    fireEvent.click(within(cardOf("Alpha body")).getByLabelText("Copy note"));
    expect(writeText).toHaveBeenCalledWith("Pinned one\n\nAlpha body");
    // button flips to its copied state
    expect(within(cardOf("Alpha body")).getByLabelText("Copied")).toBeTruthy();
  });
});
