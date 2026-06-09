// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, within, cleanup, waitFor } from "@testing-library/react";

// Mock the server actions (they pull in supabase/server which is RSC-only).
// vi.hoisted so the fns exist when the hoisted vi.mock factory runs.
const { addTodoAction, toggleTodoAction, deleteTodoAction, updateTodoAction } = vi.hoisted(() => ({
  addTodoAction: vi.fn(async (_fd: FormData) => {}),
  toggleTodoAction: vi.fn(async (_id: number, _completed: boolean) => {}),
  deleteTodoAction: vi.fn(async (_id: number) => {}),
  updateTodoAction: vi.fn(async (_id: number, _title: string) => {}),
}));
vi.mock("@/app/app/todo/actions", () => ({
  addTodoAction,
  toggleTodoAction,
  deleteTodoAction,
  updateTodoAction,
}));

import { TodoView } from "@/app/app/todo/TodoView";

const NOW = new Date().toISOString();
const todos = [
  { id: 1, title: "Active normal", completed: false, priority: 0, created_at: NOW },
  { id: 2, title: "Active soon", completed: false, priority: 1, created_at: NOW },
  { id: 3, title: "Active important", completed: false, priority: 2, created_at: NOW },
  { id: 4, title: "Done important", completed: true, priority: 2, created_at: NOW },
];

function rowOf(title: string): HTMLElement {
  return screen.getByText(title).closest("li") as HTMLElement;
}

beforeEach(() => {
  vi.clearAllMocks();
  cleanup();
});
afterEach(() => vi.unstubAllGlobals());

describe("TodoView — list & priorities", () => {
  it("renders the empty state with no todos", () => {
    render(<TodoView initialTodos={[]} />);
    expect(screen.getByText("No tasks yet.")).toBeTruthy();
  });

  it("shows active todos and hides completed behind a toggle", () => {
    render(<TodoView initialTodos={todos} />);
    expect(screen.getByText("Active normal")).toBeTruthy();
    expect(screen.getByText("Active soon")).toBeTruthy();
    // completed task is collapsed by default
    expect(screen.queryByText("Done important")).toBeNull();
    expect(screen.getByRole("button", { name: /Completed \(1\)/ })).toBeTruthy();
  });

  it("expands the completed section on click", () => {
    render(<TodoView initialTodos={todos} />);
    fireEvent.click(screen.getByRole("button", { name: /Completed \(1\)/ }));
    expect(screen.getByText("Done important")).toBeTruthy();
  });

  it("renders the right priority badge per row, and none for normal", () => {
    render(<TodoView initialTodos={todos} />);
    expect(within(rowOf("Active soon")).getByText("Soon")).toBeTruthy();
    expect(within(rowOf("Active important")).getByText("Important")).toBeTruthy();
    // a normal-priority row carries no badge
    expect(within(rowOf("Active normal")).queryByText(/^(Soon|Important)$/)).toBeNull();
  });

  it("suppresses the priority badge once a task is completed", () => {
    render(<TodoView initialTodos={todos} />);
    fireEvent.click(screen.getByRole("button", { name: /Completed \(1\)/ }));
    // "Done important" is priority 2 but completed → no badge
    expect(within(rowOf("Done important")).queryByText("Important")).toBeNull();
  });
});

describe("TodoView — row actions", () => {
  it("toggles an active task to complete", async () => {
    render(<TodoView initialTodos={todos} />);
    fireEvent.click(within(rowOf("Active normal")).getByLabelText("Mark complete"));
    await waitFor(() => expect(toggleTodoAction).toHaveBeenCalledWith(1, true));
  });

  it("toggles a completed task back to incomplete", async () => {
    render(<TodoView initialTodos={todos} />);
    fireEvent.click(screen.getByRole("button", { name: /Completed \(1\)/ }));
    fireEvent.click(within(rowOf("Done important")).getByLabelText("Mark incomplete"));
    await waitFor(() => expect(toggleTodoAction).toHaveBeenCalledWith(4, false));
  });

  it("deletes a task when confirmed, and not when dismissed", async () => {
    vi.stubGlobal("confirm", vi.fn(() => false));
    render(<TodoView initialTodos={todos} />);
    fireEvent.click(within(rowOf("Active soon")).getByLabelText("Delete"));
    expect(deleteTodoAction).not.toHaveBeenCalled();

    vi.stubGlobal("confirm", vi.fn(() => true));
    fireEvent.click(within(rowOf("Active soon")).getByLabelText("Delete"));
    await waitFor(() => expect(deleteTodoAction).toHaveBeenCalledWith(2));
  });
});

describe("TodoView — inline title edit", () => {
  // The <li> keeps a stable DOM node across the edit re-render, so `within(row)`
  // stays valid even though the visible title text becomes an input value.
  function openEditor(title: string): { row: HTMLElement; input: HTMLInputElement } {
    const row = rowOf(title);
    fireEvent.click(within(row).getByLabelText("Edit task"));
    return { row, input: within(row).getByRole("textbox") as HTMLInputElement };
  }

  it("saves a renamed title via the action", async () => {
    render(<TodoView initialTodos={todos} />);
    const { row, input } = openEditor("Active normal");
    fireEvent.change(input, { target: { value: "Renamed task" } });
    fireEvent.click(within(row).getByLabelText("Save"));
    await waitFor(() => expect(updateTodoAction).toHaveBeenCalledWith(1, "Renamed task"));
  });

  it("saves on Enter", async () => {
    render(<TodoView initialTodos={todos} />);
    const { input } = openEditor("Active soon");
    fireEvent.change(input, { target: { value: "Soon renamed" } });
    fireEvent.keyDown(input, { key: "Enter" });
    await waitFor(() => expect(updateTodoAction).toHaveBeenCalledWith(2, "Soon renamed"));
  });

  it("cancels on Escape without saving", () => {
    render(<TodoView initialTodos={todos} />);
    const { input } = openEditor("Active soon");
    fireEvent.change(input, { target: { value: "discard me" } });
    fireEvent.keyDown(input, { key: "Escape" });
    expect(updateTodoAction).not.toHaveBeenCalled();
    expect(screen.getByText("Active soon")).toBeTruthy();
  });

  it("does not save an unchanged title", () => {
    render(<TodoView initialTodos={todos} />);
    const { row } = openEditor("Active normal");
    fireEvent.click(within(row).getByLabelText("Save"));
    // value unchanged → InlineEdit skips the action
    expect(updateTodoAction).not.toHaveBeenCalled();
  });
});

describe("TodoView — add form", () => {
  it("highlights the selected priority pill", () => {
    render(<TodoView initialTodos={[]} />);
    const soon = screen.getByRole("button", { name: "Soon" });
    expect(soon.className).not.toContain("ring-cyan-500/40");
    fireEvent.click(soon);
    expect(soon.className).toContain("ring-cyan-500/40");
  });

  it("submits the title with the chosen priority", async () => {
    render(<TodoView initialTodos={[]} />);
    fireEvent.change(screen.getByPlaceholderText("Add a task…"), {
      target: { value: "Buy milk" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Soon" }));
    const form = screen.getByPlaceholderText("Add a task…").closest("form") as HTMLFormElement;
    fireEvent.submit(form);

    await waitFor(() => expect(addTodoAction).toHaveBeenCalledTimes(1));
    const fd = addTodoAction.mock.calls[0][0] as FormData;
    expect(fd.get("title")).toBe("Buy milk");
    expect(fd.get("priority")).toBe("1");
  });
});
