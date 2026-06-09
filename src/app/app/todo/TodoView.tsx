"use client";

import { useRef, useState, useTransition } from "react";
import {
  addTodoAction,
  toggleTodoAction,
  deleteTodoAction,
  updateTodoAction,
  setTodoPriorityAction,
  clearCompletedTodosAction,
} from "./actions";
import { InlineEdit } from "@/components/modern/InlineEdit";

const PRIORITY_LABELS = ["Normal", "Soon", "Important"];

interface Todo {
  id: number;
  title: string;
  completed: boolean;
  priority: number;
  created_at: string;
}

export function TodoView({ initialTodos }: { initialTodos: Todo[] }) {
  const [showCompleted, setShowCompleted] = useState(false);
  const active = initialTodos.filter((t) => !t.completed);
  const done = initialTodos.filter((t) => t.completed);

  return (
    <div>
      <AddTodoForm />
      {active.length === 0 && done.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-8 text-center">
          <div className="text-3xl text-zinc-600">✓</div>
          <p className="mt-2 text-sm text-zinc-300">No tasks yet.</p>
          <p className="text-xs text-zinc-500">Add one above.</p>
        </div>
      ) : active.length > 0 ? (
        <>
          <div className="mt-4 px-1 text-xs font-medium text-zinc-500">
            {active.length} {active.length === 1 ? "task" : "tasks"} left
          </div>
          <ul className="mt-2 space-y-2">
            {active.map((t) => (
              <TodoRow key={t.id} todo={t} />
            ))}
          </ul>
        </>
      ) : (
        <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 text-center">
          <div className="text-2xl">🎉</div>
          <p className="mt-1 text-sm text-zinc-300">All done — nothing left to do.</p>
        </div>
      )}

      {done.length > 0 && (
        <div className="mt-6">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setShowCompleted((v) => !v)}
              className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-500 hover:text-zinc-300"
            >
              <span>{showCompleted ? "▼" : "▶"}</span>
              Completed ({done.length})
            </button>
            <ClearCompletedButton count={done.length} />
          </div>
          {showCompleted && (
            <ul className="mt-3 space-y-2">
              {done.map((t) => (
                <TodoRow key={t.id} todo={t} />
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function AddTodoForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, start] = useTransition();
  const [priority, setPriority] = useState(0);

  function submit(formData: FormData) {
    formData.set("priority", String(priority));
    start(async () => {
      await addTodoAction(formData);
      formRef.current?.reset();
      setPriority(0);
    });
  }

  return (
    <form
      ref={formRef}
      action={submit}
      className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-2"
    >
      <div className="flex items-center gap-2">
        <input
          name="title"
          autoComplete="off"
          placeholder="Add a task…"
          className="flex-1 bg-transparent px-2 py-2 text-base text-zinc-100 placeholder:text-zinc-500 outline-none"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-cyan-400 disabled:opacity-50"
        >
          Add
        </button>
      </div>
      <div className="flex items-center gap-1 px-1 pb-1 pt-1">
        {[
          { v: 0, label: "Normal" },
          { v: 1, label: "Soon" },
          { v: 2, label: "Important" },
        ].map((p) => (
          <button
            key={p.v}
            type="button"
            onClick={() => setPriority(p.v)}
            className={`rounded-md px-2 py-1 text-xs font-medium transition ${
              priority === p.v
                ? "bg-cyan-500/20 text-cyan-300 ring-1 ring-cyan-500/40"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>
    </form>
  );
}

// Tappable priority — cycles Normal → Soon → Important → Normal and persists.
// Lets a task's importance change after creation (was create-only before).
function PriorityControl({ todo }: { todo: Todo }) {
  const [pending, start] = useTransition();
  const p = todo.priority;

  function cycle() {
    start(() => setTodoPriorityAction(todo.id, (p + 1) % 3));
  }

  const tone =
    p >= 2
      ? "bg-red-500/20 text-red-300"
      : p === 1
        ? "bg-amber-500/20 text-amber-300"
        : "text-zinc-600 hover:text-zinc-300";

  return (
    <button
      type="button"
      onClick={cycle}
      disabled={pending}
      aria-label={`Priority: ${PRIORITY_LABELS[p]}. Tap to change.`}
      className={`flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold transition ${tone} ${
        pending ? "opacity-50" : ""
      }`}
    >
      <FlagIcon className="h-3 w-3" filled={p > 0} />
      {p > 0 && (p >= 2 ? "Important" : "Soon")}
    </button>
  );
}

function ClearCompletedButton({ count }: { count: number }) {
  const [pending, start] = useTransition();

  function clear() {
    if (!confirm(`Delete ${count} completed task${count === 1 ? "" : "s"}?`)) return;
    start(() => clearCompletedTodosAction());
  }

  return (
    <button
      type="button"
      onClick={clear}
      disabled={pending}
      className="text-xs font-medium text-zinc-500 transition hover:text-red-400 disabled:opacity-50"
    >
      Clear
    </button>
  );
}

function FlagIcon({ className, filled }: { className?: string; filled?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 21V4M5 4h11l-2 4 2 4H5" />
    </svg>
  );
}

function TodoRow({ todo }: { todo: Todo }) {
  const [pending, start] = useTransition();

  function toggle() {
    start(() => toggleTodoAction(todo.id, !todo.completed));
  }
  function remove() {
    if (!confirm("Delete this task?")) return;
    start(() => deleteTodoAction(todo.id));
  }

  return (
    <li
      className={`group flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/40 px-3 py-3 transition ${
        pending ? "opacity-50" : ""
      }`}
    >
      <button
        type="button"
        onClick={toggle}
        aria-label={todo.completed ? "Mark incomplete" : "Mark complete"}
        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition ${
          todo.completed
            ? "border-cyan-500 bg-cyan-500 text-zinc-950"
            : "border-zinc-600 hover:border-cyan-400"
        }`}
      >
        {todo.completed && <span className="text-xs leading-none">✓</span>}
      </button>
      <div className="min-w-0 flex-1">
        <InlineEdit
          value={todo.title}
          ariaLabel="Edit task"
          onSave={(next) => updateTodoAction(todo.id, next)}
        >
          <div
            className={`break-words text-sm ${
              todo.completed ? "text-zinc-500 line-through" : "text-zinc-100"
            }`}
          >
            {todo.title}
          </div>
        </InlineEdit>
      </div>
      {!todo.completed && <PriorityControl todo={todo} />}
      <button
        type="button"
        onClick={remove}
        aria-label="Delete"
        className="ml-1 rounded-lg p-1 text-zinc-600 opacity-0 transition group-hover:opacity-100 hover:bg-zinc-800 hover:text-red-400 sm:opacity-100"
      >
        <span className="text-base leading-none">×</span>
      </button>
    </li>
  );
}
