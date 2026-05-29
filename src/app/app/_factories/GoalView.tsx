"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import {
  goalAddAction,
  goalUpdateProgressAction,
  goalCompleteAction,
  goalDeleteAction,
} from "./actions";
import type { FactoryConfig } from "@/lib/modern/catalog";
import { dueInfo } from "./factoryLib";

interface Goal {
  id: number;
  title: string;
  description: string | null;
  current_value: number | null;
  target_value: number | null;
  unit: string | null;
  status: string;
  due_date: string | null;
  created_at: string;
}

const TONE_CLASS: Record<string, string> = {
  overdue: "text-red-400",
  today: "text-amber-300",
  soon: "text-amber-300",
  future: "text-zinc-500",
};

export function GoalView({
  appId,
  config,
  goals,
}: {
  appId: string;
  config: FactoryConfig;
  goals: Goal[];
}) {
  const goalType = config.goalType!;
  const formRef = useRef<HTMLFormElement>(null);
  const [showForm, setShowForm] = useState(false);
  const [pending, start] = useTransition();
  const [showDone, setShowDone] = useState(false);

  const active = useMemo(
    () =>
      goals
        .filter((g) => g.status !== "completed")
        .sort((a, b) => {
          // Soonest deadline first; goals without a deadline sink to the bottom.
          if (a.due_date && b.due_date) return a.due_date < b.due_date ? -1 : 1;
          if (a.due_date) return -1;
          if (b.due_date) return 1;
          return a.created_at < b.created_at ? 1 : -1;
        }),
    [goals],
  );
  const done = useMemo(() => goals.filter((g) => g.status === "completed"), [goals]);

  const avgProgress = useMemo(() => {
    const withTarget = active.filter((g) => (g.target_value ?? 0) > 0);
    if (withTarget.length === 0) return null;
    const sum = withTarget.reduce((acc, g) => {
      const pct = Math.min(100, ((g.current_value ?? 0) / (g.target_value ?? 1)) * 100);
      return acc + pct;
    }, 0);
    return Math.round(sum / withTarget.length);
  }, [active]);

  const dueSoon = useMemo(
    () => active.filter((g) => g.due_date && dueInfo(g.due_date).days <= 7).length,
    [active],
  );

  function submit(formData: FormData) {
    const title = String(formData.get("title") || "").trim();
    if (!title) return;
    const target = config.hasTarget ? Number(formData.get("target") || 0) || null : null;
    const unit = config.hasTarget ? String(formData.get("unit") || "").trim() : "";
    const dueDate = String(formData.get("due_date") || "") || null;
    const description = String(formData.get("description") || "").trim();
    start(async () => {
      await goalAddAction(appId, goalType, title, target, unit, dueDate, description);
      formRef.current?.reset();
      setShowForm(false);
    });
  }

  return (
    <div>
      <div className="mb-4 grid grid-cols-3 gap-3">
        <Stat label="Active" value={String(active.length)} />
        <Stat
          label="Avg progress"
          value={avgProgress !== null ? `${avgProgress}%` : "—"}
        />
        <Stat
          label="Due ≤7d"
          value={dueSoon > 0 ? String(dueSoon) : "—"}
          tone={dueSoon > 0 ? "amber" : undefined}
        />
      </div>

      {!showForm ? (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="flex h-11 w-full items-center justify-center rounded-xl bg-cyan-500 text-sm font-semibold text-zinc-950 hover:bg-cyan-400"
        >
          + Add goal
        </button>
      ) : (
        <form
          ref={formRef}
          action={submit}
          className="space-y-2 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-3"
        >
          <input
            name="title"
            autoComplete="off"
            autoFocus
            placeholder="Goal title"
            className="w-full rounded-lg bg-zinc-900 px-3 py-2 text-base text-zinc-100 placeholder:text-zinc-500 outline-none ring-1 ring-zinc-800 focus:ring-cyan-500/50"
          />
          {config.hasTarget && (
            <div className="flex gap-2">
              <input
                name="target"
                type="number"
                inputMode="decimal"
                step="any"
                placeholder="Target"
                className="w-28 rounded-lg bg-zinc-900 px-3 py-2 text-base text-zinc-100 placeholder:text-zinc-500 outline-none ring-1 ring-zinc-800 focus:ring-cyan-500/50"
              />
              <input
                name="unit"
                autoComplete="off"
                placeholder="Unit (e.g. lbs, books)"
                className="flex-1 rounded-lg bg-zinc-900 px-3 py-2 text-base text-zinc-100 placeholder:text-zinc-500 outline-none ring-1 ring-zinc-800 focus:ring-cyan-500/50"
              />
            </div>
          )}
          <label className="block text-[11px] uppercase tracking-wider text-zinc-500">
            Deadline (optional)
            <input
              name="due_date"
              type="date"
              className="mt-1 w-full rounded-lg bg-zinc-900 px-3 py-2 text-base text-zinc-100 outline-none ring-1 ring-zinc-800 focus:ring-cyan-500/50"
            />
          </label>
          <textarea
            name="description"
            rows={2}
            placeholder="Why this matters / next action (optional)"
            className="w-full resize-none rounded-lg bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none ring-1 ring-zinc-800 focus:ring-cyan-500/50"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="flex-1 rounded-lg bg-zinc-800 px-3 py-2 text-sm font-semibold text-zinc-300 hover:bg-zinc-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending}
              className="flex-1 rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-cyan-400 disabled:opacity-50"
            >
              Add goal
            </button>
          </div>
        </form>
      )}

      {active.length === 0 && done.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-8 text-center">
          <p className="text-sm text-zinc-400">No goals yet.</p>
          <p className="mt-1 text-xs text-zinc-500">Add one above — set a target and a deadline to track your pace.</p>
        </div>
      ) : (
        <ul className="mt-4 space-y-3">
          {active.map((g) => (
            <GoalCard key={g.id} appId={appId} goal={g} config={config} />
          ))}
        </ul>
      )}

      {done.length > 0 && (
        <div className="mt-6">
          <button
            type="button"
            onClick={() => setShowDone((v) => !v)}
            className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-500 hover:text-zinc-300"
          >
            <span>{showDone ? "▼" : "▶"}</span>
            Completed ({done.length})
          </button>
          {showDone && (
            <ul className="mt-3 space-y-3">
              {done.map((g) => (
                <GoalCard key={g.id} appId={appId} goal={g} config={config} />
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "amber" }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-3 text-center">
      <div className={`text-xl font-bold tracking-tight ${tone === "amber" ? "text-amber-300" : "text-cyan-400"}`}>
        {value}
      </div>
      <div className="text-[10px] uppercase tracking-wider text-zinc-500">{label}</div>
    </div>
  );
}

function GoalCard({ appId, goal, config }: { appId: string; goal: Goal; config: FactoryConfig }) {
  const [pending, start] = useTransition();
  const [editing, setEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const isCompleted = goal.status === "completed";
  const target = goal.target_value ?? 0;
  const current = goal.current_value ?? 0;
  const hasTarget = config.hasTarget && target > 0;
  const pct = hasTarget ? Math.min(100, Math.round((current / target) * 100)) : null;
  const unit = goal.unit || "";
  const due = !isCompleted && goal.due_date ? dueInfo(goal.due_date) : null;

  function setProgress(value: number) {
    if (Number.isNaN(value)) return;
    const clamped = Math.max(0, value);
    start(async () => {
      await goalUpdateProgressAction(appId, goal.id, clamped);
      setEditing(false);
    });
  }

  function increment(delta: number) {
    setProgress(current + delta);
  }

  function complete() {
    start(() => goalCompleteAction(appId, goal.id));
  }

  function remove() {
    if (!confirm("Delete this goal?")) return;
    start(() => goalDeleteAction(appId, goal.id));
  }

  return (
    <li className={`rounded-2xl border bg-zinc-900/40 p-4 ${pending ? "opacity-50" : ""} ${due?.tone === "overdue" ? "border-red-500/40" : "border-zinc-800"}`}>
      <div className="flex items-start justify-between gap-3">
        <h3 className={`flex-1 text-base font-semibold ${isCompleted ? "text-zinc-500 line-through" : "text-zinc-100"}`}>
          {goal.title}
        </h3>
        {due && (
          <span className={`shrink-0 text-xs font-medium ${TONE_CLASS[due.tone]}`}>{due.label}</span>
        )}
        <button type="button" onClick={remove} className="rounded-lg p-1 text-zinc-600 hover:bg-zinc-800 hover:text-red-400">×</button>
      </div>

      {goal.description && (
        <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-400">{goal.description}</p>
      )}

      {hasTarget && (
        <div className="mt-3">
          <div className="mb-1 flex items-center justify-between text-xs text-zinc-400">
            <span>
              {current.toLocaleString()} / {target.toLocaleString()}
              {unit && <span className="text-zinc-500"> {unit}</span>}
            </span>
            <span className="font-semibold text-cyan-400">{pct}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
            <div
              className={`h-full rounded-full transition-all ${pct === 100 ? "bg-emerald-500" : "bg-cyan-500"}`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}

      {!isCompleted && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {hasTarget &&
            (editing ? (
              <>
                <input
                  ref={inputRef}
                  type="number"
                  inputMode="decimal"
                  step="any"
                  defaultValue={current}
                  className="w-24 rounded-lg bg-zinc-900 px-2 py-1.5 text-sm text-zinc-100 outline-none ring-1 ring-zinc-800 focus:ring-cyan-500/50"
                />
                <button
                  type="button"
                  onClick={() => setProgress(Number(inputRef.current?.value || 0))}
                  className="rounded-lg bg-cyan-500 px-3 py-1.5 text-xs font-semibold text-zinc-950 hover:bg-cyan-400"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="rounded-lg bg-zinc-800 px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:bg-zinc-700"
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => increment(1)}
                  className="rounded-lg bg-zinc-800 px-3 py-1.5 text-xs font-semibold text-zinc-200 hover:bg-zinc-700"
                >
                  +1
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="rounded-lg bg-zinc-800 px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:bg-zinc-700"
                >
                  Set value
                </button>
              </>
            ))}
          <button
            type="button"
            onClick={complete}
            className="rounded-lg bg-emerald-600/20 px-3 py-1.5 text-xs font-semibold text-emerald-300 ring-1 ring-emerald-500/30 hover:bg-emerald-600/30"
          >
            Mark complete
          </button>
        </div>
      )}
    </li>
  );
}
