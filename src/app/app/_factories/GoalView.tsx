"use client";

import { useRef, useState, useTransition } from "react";
import {
  goalAddAction,
  goalUpdateProgressAction,
  goalCompleteAction,
  goalDeleteAction,
} from "./actions";
import type { FactoryConfig } from "@/lib/modern/catalog";

interface Goal {
  id: number;
  title: string;
  current_value: number | null;
  target_value: number | null;
  status: string;
  created_at: string;
}

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
  const [pending, start] = useTransition();
  const active = goals.filter((g) => g.status !== "completed");
  const done = goals.filter((g) => g.status === "completed");
  const [showDone, setShowDone] = useState(false);

  function submit(formData: FormData) {
    const title = String(formData.get("title") || "").trim();
    if (!title) return;
    const target = config.hasTarget ? Number(formData.get("target") || 0) : null;
    start(async () => {
      await goalAddAction(appId, goalType, title, target);
      formRef.current?.reset();
    });
  }

  return (
    <div>
      <form
        ref={formRef}
        action={submit}
        className="space-y-2 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-3"
      >
        <input
          name="title"
          autoComplete="off"
          placeholder="Goal title"
          className="w-full rounded-lg bg-zinc-900 px-3 py-2 text-base text-zinc-100 placeholder:text-zinc-500 outline-none ring-1 ring-zinc-800 focus:ring-cyan-500/50"
        />
        <div className="flex gap-2">
          {config.hasTarget && (
            <input
              name="target"
              type="number"
              inputMode="decimal"
              step="any"
              placeholder="Target"
              className="w-28 rounded-lg bg-zinc-900 px-3 py-2 text-base text-zinc-100 placeholder:text-zinc-500 outline-none ring-1 ring-zinc-800 focus:ring-cyan-500/50"
            />
          )}
          <button
            type="submit"
            disabled={pending}
            className="flex-1 rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-cyan-400 disabled:opacity-50"
          >
            Add goal
          </button>
        </div>
      </form>

      {active.length === 0 && done.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-8 text-center">
          <p className="text-sm text-zinc-400">No goals yet.</p>
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

function GoalCard({ appId, goal, config }: { appId: string; goal: Goal; config: FactoryConfig }) {
  const [pending, start] = useTransition();
  const [editing, setEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const isCompleted = goal.status === "completed";
  const target = goal.target_value ?? 0;
  const current = goal.current_value ?? 0;
  const pct = config.hasTarget && target > 0 ? Math.min(100, Math.round((current / target) * 100)) : null;

  function saveProgress() {
    const v = Number(inputRef.current?.value || 0);
    if (Number.isNaN(v)) return;
    start(async () => {
      await goalUpdateProgressAction(appId, goal.id, v);
      setEditing(false);
    });
  }

  function complete() {
    start(() => goalCompleteAction(appId, goal.id));
  }

  function remove() {
    if (!confirm("Delete this goal?")) return;
    start(() => goalDeleteAction(appId, goal.id));
  }

  return (
    <li className={`rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 ${pending ? "opacity-50" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <h3 className={`flex-1 text-base font-semibold ${isCompleted ? "text-zinc-500 line-through" : "text-zinc-100"}`}>
          {goal.title}
        </h3>
        <button type="button" onClick={remove} className="rounded-lg p-1 text-zinc-600 hover:bg-zinc-800 hover:text-red-400">×</button>
      </div>

      {config.hasTarget && target > 0 && (
        <div className="mt-3">
          <div className="mb-1 flex items-center justify-between text-xs text-zinc-400">
            <span>
              {current} / {target}
            </span>
            <span className="font-semibold text-cyan-400">{pct}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
            <div
              className="h-full rounded-full bg-cyan-500 transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}

      {!isCompleted && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {config.hasTarget && (
            editing ? (
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
                  onClick={saveProgress}
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
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="rounded-lg bg-zinc-800 px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:bg-zinc-700"
              >
                Update progress
              </button>
            )
          )}
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
