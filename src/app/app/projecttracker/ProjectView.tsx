"use client";

import { useRef, useState, useTransition } from "react";
import type { Project, ProjectTask } from "./page";
import { pct, dueLabel, blockedSince, sortFilter, type SortKey } from "./lib";
import {
  addProject,
  addTask,
  deleteProject,
  deleteTask,
  setBlockedReason,
  setDueDate,
  setNextAction,
  setStatus,
  toggleTask,
} from "./actions";

const STATUS_META: Record<
  string,
  { label: string; order: number; badge: string; bar: string }
> = {
  planning: { label: "Planning", order: 0, badge: "bg-zinc-700 text-zinc-200", bar: "bg-zinc-500" },
  active: { label: "Active", order: 1, badge: "bg-cyan-500/20 text-cyan-300", bar: "bg-cyan-500" },
  blocked: { label: "Blocked", order: 2, badge: "bg-rose-500/20 text-rose-300", bar: "bg-rose-500" },
  done: { label: "Done", order: 3, badge: "bg-emerald-500/20 text-emerald-300", bar: "bg-emerald-500" },
};

const STATUS_OPTIONS = ["planning", "active", "blocked", "done"];

/** Next status in the pipeline for tap-to-advance on the board (wraps done → planning). */
const NEXT_STATUS: Record<string, string> = {
  planning: "active",
  active: "blocked",
  blocked: "done",
  done: "planning",
};

const SORT_LABELS: { key: SortKey; label: string }[] = [
  { key: "status", label: "Status" },
  { key: "deadline", label: "Deadline" },
  { key: "progress", label: "% done" },
  { key: "created", label: "Newest" },
];

export function ProjectView({ projects }: { projects: Project[] }) {
  const [view, setView] = useState<"list" | "board">("list");
  const [filter, setFilter] = useState<string>("all");
  const [sort, setSort] = useState<SortKey>("status");

  const counts: Record<string, number> = {};
  for (const p of projects) counts[p.status] = (counts[p.status] || 0) + 1;

  const visible = sortFilter(projects, filter, sort);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-4 gap-2">
        {STATUS_OPTIONS.map((s) => (
          <Stat key={s} label={STATUS_META[s].label} value={counts[s] || 0} bar={STATUS_META[s].bar} />
        ))}
      </div>

      <AddForm />

      {projects.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <Controls
            view={view}
            setView={setView}
            filter={filter}
            setFilter={setFilter}
            sort={sort}
            setSort={setSort}
          />

          {view === "board" ? (
            <Board projects={filter === "all" ? projects : visible} />
          ) : (
            <ul className="space-y-3">
              {visible.map((p) => (
                <ProjectCard key={p.id} project={p} />
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

function Controls({
  view,
  setView,
  filter,
  setFilter,
  sort,
  setSort,
}: {
  view: "list" | "board";
  setView: (v: "list" | "board") => void;
  filter: string;
  setFilter: (v: string) => void;
  sort: SortKey;
  setSort: (v: SortKey) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="inline-flex rounded-lg border border-zinc-800 bg-zinc-900/60 p-0.5">
        {(["list", "board"] as const).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setView(v)}
            className={`min-h-[36px] rounded-md px-3 text-xs font-semibold capitalize ${
              view === v ? "bg-cyan-500 text-zinc-950" : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            {v}
          </button>
        ))}
      </div>

      <label className="ml-auto flex items-center gap-1.5 text-[11px] text-zinc-500">
        Filter
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-xs text-zinc-200 outline-none focus:border-cyan-500"
        >
          <option value="all">All</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {STATUS_META[s].label}
            </option>
          ))}
        </select>
      </label>

      <label className="flex items-center gap-1.5 text-[11px] text-zinc-500">
        Sort
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-xs text-zinc-200 outline-none focus:border-cyan-500"
        >
          {SORT_LABELS.map((s) => (
            <option key={s.key} value={s.key}>
              {s.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

function Board({ projects }: { projects: Project[] }) {
  const byStatus: Record<string, Project[]> = { planning: [], active: [], blocked: [], done: [] };
  for (const p of projects) (byStatus[p.status] ??= []).push(p);

  return (
    <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-2">
      {STATUS_OPTIONS.map((s) => (
        <div key={s} className="flex w-60 shrink-0 flex-col gap-2">
          <div className="flex items-center justify-between px-0.5">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-zinc-300">
              <span className={`inline-block h-2 w-2 rounded-full ${STATUS_META[s].bar}`} />
              {STATUS_META[s].label}
            </span>
            <span className="text-[11px] tabular-nums text-zinc-500">{byStatus[s].length}</span>
          </div>
          <div className="flex flex-col gap-2 rounded-xl border border-zinc-800 bg-zinc-900/30 p-2">
            {byStatus[s].length === 0 ? (
              <p className="px-1 py-3 text-center text-[11px] text-zinc-600">Empty</p>
            ) : (
              byStatus[s].map((p) => <BoardCard key={p.id} project={p} />)
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function BoardCard({ project }: { project: Project }) {
  const [pending, start] = useTransition();
  const percent = pct(project.tasks);
  const due = dueLabel(project.due_date);
  const since = project.status === "blocked" ? blockedSince(project.blocked_at) : null;
  const nextLabel = STATUS_META[NEXT_STATUS[project.status]]?.label ?? "";

  return (
    <div className={`rounded-lg border border-zinc-800 bg-zinc-900/60 p-2.5 ${pending ? "opacity-60" : ""}`}>
      <div className="break-words text-xs font-medium text-zinc-100">{project.title}</div>

      {project.tasks.length > 0 && (
        <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-zinc-800">
          <div className="h-full rounded-full bg-cyan-500" style={{ width: `${percent}%` }} />
        </div>
      )}

      <div className="mt-1.5 flex flex-wrap items-center gap-1">
        {project.tasks.length > 0 && (
          <span className="text-[10px] text-zinc-500">{percent}%</span>
        )}
        {since && (
          <span className="rounded-full bg-rose-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-rose-300">
            {since}
          </span>
        )}
        {due && (
          <span
            className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
              due.overdue ? "bg-rose-500/15 text-rose-300" : "bg-zinc-800 text-zinc-300"
            }`}
          >
            {due.text}
          </span>
        )}
      </div>

      <button
        type="button"
        onClick={() => start(() => setStatus(project.id, NEXT_STATUS[project.status]))}
        disabled={pending}
        className="mt-2 min-h-[32px] w-full rounded-md border border-zinc-700 px-2 text-[11px] font-semibold text-zinc-300 hover:border-cyan-500 hover:text-cyan-300 disabled:opacity-50"
      >
        → {nextLabel}
      </button>
    </div>
  );
}

function Stat({ label, value, bar }: { label: string; value: number; bar: string }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 px-2 py-3 text-center">
      <div className="text-lg font-bold tabular-nums text-zinc-100">{value}</div>
      <div className="mt-1 flex justify-center">
        <span className={`inline-block h-1 w-7 rounded-full ${bar}`} />
      </div>
      <div className="mt-1 text-[10px] font-medium uppercase tracking-wider text-zinc-500">{label}</div>
    </div>
  );
}

function AddForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, start] = useTransition();

  function submit(formData: FormData) {
    const title = String(formData.get("title") || "").trim();
    if (!title) return;
    start(async () => {
      await addProject(title);
      formRef.current?.reset();
    });
  }

  return (
    <form
      ref={formRef}
      action={submit}
      className="flex flex-col gap-2 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-3 sm:flex-row"
    >
      <input
        name="title"
        autoComplete="off"
        placeholder="New project…"
        className="min-w-0 flex-1 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-base text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-cyan-500/60"
      />
      <button
        type="submit"
        disabled={pending}
        className="min-h-[44px] rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-cyan-400 disabled:opacity-50 sm:w-auto"
      >
        Add project
      </button>
    </form>
  );
}

function ProjectCard({ project }: { project: Project }) {
  const [pending, start] = useTransition();
  const [expanded, setExpanded] = useState(false);
  const [editingNext, setEditingNext] = useState(false);
  const meta = STATUS_META[project.status] ?? STATUS_META.planning;
  const percent = pct(project.tasks);
  const doneCount = project.tasks.filter((t) => t.completed).length;
  const due = dueLabel(project.due_date);
  const since = project.status === "blocked" ? blockedSince(project.blocked_at) : null;

  function remove() {
    if (!confirm(`Delete "${project.title}" and its tasks?`)) return;
    start(() => deleteProject(project.id));
  }

  return (
    <li
      className={`rounded-2xl border border-zinc-800 bg-zinc-900/40 p-3 ${pending ? "opacity-60" : ""}`}
    >
      <div className="flex items-start gap-3">
        <span className={`mt-1 h-9 w-1 shrink-0 rounded-full ${meta.bar}`} aria-hidden />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="break-words text-sm font-medium text-zinc-100">{project.title}</span>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${meta.badge}`}>
              {meta.label}
            </span>
            {due && (
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                  due.overdue ? "bg-rose-500/15 text-rose-300" : "bg-zinc-800 text-zinc-300"
                }`}
              >
                {due.text}
              </span>
            )}
            {since && (
              <span className="rounded-full bg-rose-500/15 px-2 py-0.5 text-[10px] font-semibold text-rose-300">
                {since}
              </span>
            )}
          </div>

          {/* Blocked reason — only when blocked, inline-editable */}
          {project.status === "blocked" && (
            <BlockedReason project={project} start={start} />
          )}

          {/* Progress bar derived from tasks */}
          {project.tasks.length > 0 && (
            <div className="mt-2">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
                <div
                  className="h-full rounded-full bg-cyan-500 transition-all"
                  style={{ width: `${percent}%` }}
                />
              </div>
              <div className="mt-1 text-[11px] text-zinc-500">
                {doneCount}/{project.tasks.length} tasks · {percent}%
              </div>
            </div>
          )}

          {/* Next action — the card CTA */}
          <NextAction
            project={project}
            editing={editingNext}
            setEditing={setEditingNext}
            start={start}
          />
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <select
            aria-label="Status"
            value={project.status}
            onChange={(e) => start(() => setStatus(project.id, e.target.value))}
            disabled={pending}
            className="rounded-lg border border-zinc-700 bg-zinc-900 px-1.5 py-1.5 text-xs text-zinc-300 outline-none focus:border-cyan-500"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {STATUS_META[s].label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={remove}
            disabled={pending}
            aria-label="Delete project"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-800 hover:text-rose-400"
          >
            <span className="text-lg leading-none">×</span>
          </button>
        </div>
      </div>

      {/* Expandable: tasks + deadline editor */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="mt-2 text-[11px] font-medium text-cyan-400 hover:text-cyan-300"
      >
        {expanded ? "Hide tasks" : project.tasks.length > 0 ? "Tasks & details" : "Add tasks & details"}
      </button>

      {expanded && (
        <div className="mt-3 space-y-3 border-t border-zinc-800 pt-3">
          <TaskList projectId={project.id} tasks={project.tasks} />
          <DueDateEditor project={project} start={start} />
        </div>
      )}
    </li>
  );
}

function NextAction({
  project,
  editing,
  setEditing,
  start,
}: {
  project: Project;
  editing: boolean;
  setEditing: (v: boolean) => void;
  start: React.TransitionStartFunction;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  function save() {
    const value = inputRef.current?.value ?? "";
    start(() => setNextAction(project.id, value));
    setEditing(false);
  }

  if (editing) {
    return (
      <div className="mt-2 flex items-center gap-2">
        <input
          ref={inputRef}
          autoFocus
          defaultValue={project.next_action}
          placeholder="Next action…"
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
            if (e.key === "Escape") setEditing(false);
          }}
          className="min-w-0 flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-xs text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-cyan-500"
        />
        <button
          type="button"
          onClick={save}
          className="shrink-0 rounded-lg bg-cyan-500 px-2.5 py-1.5 text-xs font-semibold text-zinc-950 hover:bg-cyan-400"
        >
          Save
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className="mt-2 flex w-full items-center gap-1.5 text-left"
    >
      <span className="text-cyan-500">→</span>
      {project.next_action ? (
        <span className="break-words text-xs text-zinc-300">{project.next_action}</span>
      ) : (
        <span className="text-xs italic text-zinc-500">Set next action…</span>
      )}
    </button>
  );
}

function BlockedReason({
  project,
  start,
}: {
  project: Project;
  start: React.TransitionStartFunction;
}) {
  const [editing, setEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function save() {
    const value = inputRef.current?.value ?? "";
    start(() => setBlockedReason(project.id, value));
    setEditing(false);
  }

  if (editing) {
    return (
      <div className="mt-2 flex items-center gap-2">
        <input
          ref={inputRef}
          autoFocus
          defaultValue={project.blocked_reason}
          placeholder="What's blocking it?"
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
            if (e.key === "Escape") setEditing(false);
          }}
          className="min-w-0 flex-1 rounded-lg border border-rose-500/40 bg-zinc-900 px-2 py-1.5 text-xs text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-rose-400"
        />
        <button
          type="button"
          onClick={save}
          className="shrink-0 rounded-lg bg-rose-500 px-2.5 py-1.5 text-xs font-semibold text-zinc-950 hover:bg-rose-400"
        >
          Save
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className="mt-2 flex w-full items-start gap-1.5 text-left"
    >
      <span className="text-rose-400">⚠</span>
      {project.blocked_reason ? (
        <span className="break-words text-xs text-rose-200/90">{project.blocked_reason}</span>
      ) : (
        <span className="text-xs italic text-zinc-500">Why is it blocked?</span>
      )}
    </button>
  );
}

function TaskList({ projectId, tasks }: { projectId: number; tasks: ProjectTask[] }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, start] = useTransition();

  function submit(formData: FormData) {
    const title = String(formData.get("task") || "").trim();
    if (!title) return;
    start(async () => {
      await addTask(projectId, title);
      formRef.current?.reset();
    });
  }

  return (
    <div className="space-y-1.5">
      {tasks.length > 0 && (
        <ul className="space-y-1">
          {tasks.map((t) => (
            <TaskRow key={t.id} task={t} />
          ))}
        </ul>
      )}
      <form ref={formRef} action={submit} className="flex items-center gap-2">
        <input
          name="task"
          autoComplete="off"
          placeholder="+ task"
          className="min-w-0 flex-1 rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-1.5 text-xs text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-cyan-500/60"
        />
        <button
          type="submit"
          disabled={pending}
          className="shrink-0 rounded-lg border border-zinc-700 px-2.5 py-1.5 text-xs font-semibold text-zinc-300 hover:border-cyan-500 hover:text-cyan-300 disabled:opacity-50"
        >
          Add
        </button>
      </form>
    </div>
  );
}

function TaskRow({ task }: { task: ProjectTask }) {
  const [pending, start] = useTransition();

  function remove() {
    start(() => deleteTask(task.id));
  }

  return (
    <li className={`flex items-center gap-2 ${pending ? "opacity-50" : ""}`}>
      <button
        type="button"
        onClick={() => start(() => toggleTask(task.id, !task.completed))}
        disabled={pending}
        aria-label={task.completed ? "Mark incomplete" : "Mark complete"}
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
          task.completed
            ? "border-cyan-500 bg-cyan-500 text-zinc-950"
            : "border-zinc-600 text-transparent hover:border-cyan-500"
        }`}
      >
        <span className="text-xs leading-none">✓</span>
      </button>
      <span
        className={`min-w-0 flex-1 break-words text-xs ${
          task.completed ? "text-zinc-500 line-through" : "text-zinc-200"
        }`}
      >
        {task.title}
      </span>
      <button
        type="button"
        onClick={remove}
        disabled={pending}
        aria-label="Delete task"
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-zinc-600 hover:bg-zinc-800 hover:text-rose-400"
      >
        <span className="text-sm leading-none">×</span>
      </button>
    </li>
  );
}

function DueDateEditor({
  project,
  start,
}: {
  project: Project;
  start: React.TransitionStartFunction;
}) {
  return (
    <div className="flex items-center gap-2">
      <label className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">
        Deadline
      </label>
      <input
        type="date"
        defaultValue={project.due_date ?? ""}
        onChange={(e) => start(() => setDueDate(project.id, e.target.value))}
        className="rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-xs text-zinc-200 outline-none focus:border-cyan-500"
      />
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-8 text-center">
      <div className="text-3xl text-zinc-600">◧</div>
      <p className="mt-2 text-sm text-zinc-300">No projects yet.</p>
      <p className="text-xs text-zinc-500">
        Add one above, then move it through planning → active → blocked → done and check off tasks.
      </p>
    </div>
  );
}
