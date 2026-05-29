"use client";

import { useRef, useTransition } from "react";
import type { MatrixTask } from "./page";
import { addTask, completeTask, deleteTask, setQuadrant } from "./actions";

interface Quad {
  key: number;
  label: string;
  sub: string;
  cell: string; // hero cell classes
  dot: string; // section accent
}

const QUADS: Quad[] = [
  { key: 1, label: "Do", sub: "Urgent & important", cell: "border-rose-500/40 bg-rose-500/10 text-rose-200", dot: "bg-rose-500" },
  { key: 2, label: "Schedule", sub: "Important, not urgent", cell: "border-cyan-500/40 bg-cyan-500/10 text-cyan-200", dot: "bg-cyan-500" },
  { key: 3, label: "Delegate", sub: "Urgent, not important", cell: "border-amber-500/40 bg-amber-500/10 text-amber-200", dot: "bg-amber-500" },
  { key: 4, label: "Drop", sub: "Neither — let it go", cell: "border-zinc-600 bg-zinc-800/40 text-zinc-300", dot: "bg-zinc-500" },
];

const MOVE_OPTIONS = [
  { v: 0, label: "Unsorted" },
  { v: 1, label: "Do" },
  { v: 2, label: "Schedule" },
  { v: 3, label: "Delegate" },
  { v: 4, label: "Drop" },
];

export function MatrixView({ tasks }: { tasks: MatrixTask[] }) {
  const byQuad = (q: number) => tasks.filter((t) => t.quadrant === q);
  const counts: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0 };
  for (const t of tasks) counts[t.quadrant] = (counts[t.quadrant] || 0) + 1;

  const unsorted = byQuad(0);
  const important = counts[1] + counts[2];

  return (
    <div className="space-y-6">
      <MatrixMap counts={counts} />
      <div className="grid grid-cols-3 gap-2">
        <Stat label="To triage" value={String(counts[0])} />
        <Stat label="Important" value={String(important)} />
        <Stat label="Active" value={String(tasks.length)} />
      </div>

      <AddTaskForm />

      {tasks.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-5">
          {unsorted.length > 0 && (
            <Section
              title="Unsorted"
              sub="Place each into a quadrant"
              dot="bg-zinc-400"
              tasks={unsorted}
            />
          )}
          {QUADS.map((q) => (
            <Section
              key={q.key}
              title={q.label}
              sub={q.sub}
              dot={q.dot}
              tasks={byQuad(q.key)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function MatrixMap({ counts }: { counts: Record<number, number> }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
      <div className="grid grid-cols-[auto_1fr_1fr] gap-1.5 text-center">
        <div />
        <ColHead>Urgent</ColHead>
        <ColHead>Not urgent</ColHead>

        <RowHead>Important</RowHead>
        <MapCell quad={QUADS[0]} count={counts[1]} />
        <MapCell quad={QUADS[1]} count={counts[2]} />

        <RowHead>Not imp.</RowHead>
        <MapCell quad={QUADS[2]} count={counts[3]} />
        <MapCell quad={QUADS[3]} count={counts[4]} />
      </div>
    </div>
  );
}

function ColHead({ children }: { children: React.ReactNode }) {
  return (
    <div className="pb-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
      {children}
    </div>
  );
}

function RowHead({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center pr-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
      {children}
    </div>
  );
}

function MapCell({ quad, count }: { quad: Quad; count: number }) {
  return (
    <div className={`rounded-xl border p-3 ${quad.cell}`}>
      <div className="text-2xl font-bold tabular-nums">{count}</div>
      <div className="text-[11px] font-medium opacity-90">{quad.label}</div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 px-3 py-3 text-center">
      <div className="text-base font-semibold text-zinc-100">{value}</div>
      <div className="mt-0.5 text-[10px] font-medium uppercase tracking-wider text-zinc-500">
        {label}
      </div>
    </div>
  );
}

function AddTaskForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, start] = useTransition();

  function submit(formData: FormData) {
    const title = String(formData.get("title") || "").trim();
    if (!title) return;
    start(async () => {
      await addTask(title, 0);
      formRef.current?.reset();
    });
  }

  return (
    <form
      ref={formRef}
      action={submit}
      className="flex items-center gap-2 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-2"
    >
      <input
        name="title"
        autoComplete="off"
        placeholder="New task → Unsorted…"
        className="min-w-0 flex-1 bg-transparent px-2 py-2 text-base text-zinc-100 placeholder:text-zinc-500 outline-none"
      />
      <button
        type="submit"
        disabled={pending}
        className="min-h-[44px] rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-cyan-400 disabled:opacity-50"
      >
        Add
      </button>
    </form>
  );
}

function Section({
  title,
  sub,
  dot,
  tasks,
}: {
  title: string;
  sub: string;
  dot: string;
  tasks: MatrixTask[];
}) {
  return (
    <div>
      <div className="mb-2 flex items-baseline gap-2">
        <span className={`inline-block h-2.5 w-2.5 rounded-full ${dot}`} />
        <h3 className="text-sm font-semibold text-zinc-100">{title}</h3>
        <span className="text-xs text-zinc-500">{sub}</span>
        <span className="ml-auto text-xs tabular-nums text-zinc-500">{tasks.length}</span>
      </div>
      {tasks.length === 0 ? (
        <p className="rounded-xl border border-dashed border-zinc-800 px-3 py-2 text-xs text-zinc-600">
          Nothing here.
        </p>
      ) : (
        <ul className="space-y-2">
          {tasks.map((t) => (
            <TaskRow key={t.id} task={t} />
          ))}
        </ul>
      )}
    </div>
  );
}

function TaskRow({ task }: { task: MatrixTask }) {
  const [pending, start] = useTransition();

  function remove() {
    if (!confirm("Delete this task?")) return;
    start(() => deleteTask(task.id));
  }

  return (
    <li
      className={`flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/40 px-3 py-2.5 ${
        pending ? "opacity-50" : ""
      }`}
    >
      <button
        type="button"
        onClick={() => start(() => completeTask(task.id))}
        disabled={pending}
        aria-label="Mark done"
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-zinc-600 text-transparent hover:border-cyan-400 hover:text-cyan-400"
      >
        ✓
      </button>
      <span className="min-w-0 flex-1 break-words text-sm text-zinc-100">{task.title}</span>
      <select
        aria-label="Move to quadrant"
        value={task.quadrant}
        onChange={(e) => start(() => setQuadrant(task.id, Number(e.target.value)))}
        disabled={pending}
        className="shrink-0 rounded-lg border border-zinc-700 bg-zinc-900 px-1.5 py-1.5 text-xs text-zinc-300 outline-none focus:border-cyan-500"
      >
        {MOVE_OPTIONS.map((o) => (
          <option key={o.v} value={o.v}>
            {o.label}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={remove}
        disabled={pending}
        aria-label="Delete task"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-800 hover:text-red-400"
      >
        <span className="text-lg leading-none">×</span>
      </button>
    </li>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-8 text-center">
      <div className="text-3xl text-zinc-600">⊞</div>
      <p className="mt-2 text-sm text-zinc-300">No active tasks.</p>
      <p className="text-xs text-zinc-500">
        Add one above, or finish some in Todo — they'll appear here to prioritize.
      </p>
    </div>
  );
}
