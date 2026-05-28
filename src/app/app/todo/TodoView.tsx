"use client";

import { useRef, useState, useTransition } from "react";
import { addTodoAction, toggleTodoAction, deleteTodoAction } from "./actions";

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
      ) : (
        <ul className="mt-4 space-y-2">
          {active.map((t) => (
            <TodoRow key={t.id} todo={t} />
          ))}
        </ul>
      )}

      {done.length > 0 && (
        <div className="mt-6">
          <button
            type="button"
            onClick={() => setShowCompleted((v) => !v)}
            className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-500 hover:text-zinc-300"
          >
            <span>{showCompleted ? "▼" : "▶"}</span>
            Completed ({done.length})
          </button>
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
          { v: 1, label: "!" },
          { v: 2, label: "!!" },
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
        <div
          className={`break-words text-sm ${
            todo.completed ? "text-zinc-500 line-through" : "text-zinc-100"
          }`}
        >
          {todo.title}
        </div>
      </div>
      {todo.priority > 0 && !todo.completed && (
        <span
          className={`shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-bold ${
            todo.priority >= 2 ? "bg-red-500/20 text-red-300" : "bg-amber-500/20 text-amber-300"
          }`}
        >
          {todo.priority >= 2 ? "!!" : "!"}
        </span>
      )}
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
