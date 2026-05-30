"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import type { KeyResult, Objective } from "./page";
import {
  CONFIDENCES,
  cleanConfidence,
  currentCycle,
  krPct,
  objectiveScore,
  type Confidence,
} from "./lib";
import {
  addKeyResult,
  addObjective,
  deleteKeyResult,
  deleteObjective,
  setConfidence,
  setCycle,
  setKeyResultTitle,
  setObjectiveTitle,
  updateKeyResult,
} from "./actions";

const CONFIDENCE_META: Record<
  Confidence,
  { label: string; accent: string; dot: string; badge: string }
> = {
  on_track: {
    label: "On track",
    accent: "bg-emerald-500",
    dot: "bg-emerald-400",
    badge: "bg-emerald-500/20 text-emerald-300",
  },
  at_risk: {
    label: "At risk",
    accent: "bg-amber-500",
    dot: "bg-amber-400",
    badge: "bg-amber-500/20 text-amber-300",
  },
  off_track: {
    label: "Off track",
    accent: "bg-rose-500",
    dot: "bg-rose-400",
    badge: "bg-rose-500/20 text-rose-300",
  },
};

const ALL = "__all__";

export function OkrView({ objectives }: { objectives: Objective[] }) {
  // Cycles present, newest-looking first; default the filter to the current
  // quarter if anything lives there, else "all".
  const cycles = useMemo(() => {
    const set = new Set<string>();
    for (const o of objectives) if (o.cycle) set.add(o.cycle);
    return [...set].sort().reverse();
  }, [objectives]);

  const cur = currentCycle();
  const [cycleFilter, setCycleFilter] = useState<string>(() =>
    objectives.some((o) => o.cycle === cur) ? cur : ALL,
  );

  const visible = useMemo(
    () =>
      cycleFilter === ALL
        ? objectives
        : objectives.filter((o) => o.cycle === cycleFilter),
    [objectives, cycleFilter],
  );

  return (
    <div className="space-y-6">
      <AddForm />

      {cycles.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">
            Cycle
          </span>
          <Chip active={cycleFilter === ALL} onClick={() => setCycleFilter(ALL)}>
            All
          </Chip>
          {cycles.map((c) => (
            <Chip key={c} active={cycleFilter === c} onClick={() => setCycleFilter(c)}>
              {c}
            </Chip>
          ))}
        </div>
      )}

      {objectives.length === 0 ? (
        <EmptyState />
      ) : visible.length === 0 ? (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 text-center text-sm text-zinc-400">
          No objectives in {cycleFilter}.
        </div>
      ) : (
        <ul className="space-y-3">
          {visible.map((o) => (
            <ObjectiveCard key={o.id} objective={o} />
          ))}
        </ul>
      )}
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
        active
          ? "bg-cyan-500 text-zinc-950"
          : "border border-zinc-700 text-zinc-300 hover:border-cyan-500 hover:text-cyan-300"
      }`}
    >
      {children}
    </button>
  );
}

function AddForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, start] = useTransition();

  function submit(formData: FormData) {
    const title = String(formData.get("title") || "").trim();
    if (!title) return;
    const cycle = String(formData.get("cycle") || "").trim();
    start(async () => {
      await addObjective(title, cycle);
      formRef.current?.reset();
    });
  }

  return (
    <form
      ref={formRef}
      action={submit}
      className="flex flex-col gap-2 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-3"
    >
      <input
        name="title"
        autoComplete="off"
        placeholder="New objective…"
        className="min-w-0 flex-1 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-base text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-cyan-500/60"
      />
      <div className="flex gap-2">
        <input
          name="cycle"
          autoComplete="off"
          defaultValue={currentCycle()}
          placeholder="Cycle (e.g. Q2 2026)"
          className="min-w-0 flex-1 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-cyan-500/60"
        />
        <button
          type="submit"
          disabled={pending}
          className="min-h-[44px] shrink-0 rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-cyan-400 disabled:opacity-50"
        >
          Add
        </button>
      </div>
    </form>
  );
}

function ObjectiveCard({ objective }: { objective: Objective }) {
  const [pending, start] = useTransition();
  const [expanded, setExpanded] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const meta = CONFIDENCE_META[objective.confidence] ?? CONFIDENCE_META.on_track;
  const score = objectiveScore(objective.key_results);
  const krCount = objective.key_results.length;

  function remove() {
    if (!confirm(`Delete "${objective.title}" and its key results?`)) return;
    start(() => deleteObjective(objective.id));
  }

  return (
    <li
      className={`rounded-2xl border border-zinc-800 bg-zinc-900/40 p-3 ${pending ? "opacity-60" : ""}`}
    >
      <div className="flex items-start gap-3">
        <span className={`mt-1 h-9 w-1 shrink-0 rounded-full ${meta.accent}`} aria-hidden />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {editingTitle ? (
              <EditableTitle
                initial={objective.title}
                onSave={(v) => {
                  start(() => setObjectiveTitle(objective.id, v));
                  setEditingTitle(false);
                }}
                onCancel={() => setEditingTitle(false)}
              />
            ) : (
              <button
                type="button"
                onClick={() => setEditingTitle(true)}
                className="break-words text-left text-sm font-semibold text-zinc-100 hover:text-cyan-300"
              >
                {objective.title}
              </button>
            )}
            {objective.cycle && (
              <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] font-semibold text-zinc-300">
                {objective.cycle}
              </span>
            )}
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${meta.badge}`}>
              {meta.label}
            </span>
          </div>

          {/* Roll-up score = mean of KR %s */}
          <div className="mt-2">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
              <div
                className={`h-full rounded-full transition-all ${meta.accent}`}
                style={{ width: `${score}%` }}
              />
            </div>
            <div className="mt-1 text-[11px] text-zinc-500">
              {krCount === 0
                ? "No key results yet"
                : `${score}% · ${krCount} key result${krCount === 1 ? "" : "s"}`}
            </div>
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <span className="text-lg font-bold tabular-nums text-zinc-100">{score}%</span>
          <button
            type="button"
            onClick={remove}
            disabled={pending}
            aria-label="Delete objective"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-800 hover:text-rose-400"
          >
            <span className="text-lg leading-none">×</span>
          </button>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2">
        <ConfidencePicker objective={objective} start={start} pending={pending} />
        <CycleEditor objective={objective} start={start} />
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="ml-auto text-[11px] font-medium text-cyan-400 hover:text-cyan-300"
        >
          {expanded ? "Hide key results" : krCount > 0 ? "Key results" : "Add key results"}
        </button>
      </div>

      {expanded && (
        <div className="mt-3 space-y-2 border-t border-zinc-800 pt-3">
          <KeyResultList objectiveId={objective.id} krs={objective.key_results} />
        </div>
      )}
    </li>
  );
}

function EditableTitle({
  initial,
  onSave,
  onCancel,
}: {
  initial: string;
  onSave: (v: string) => void;
  onCancel: () => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <input
      ref={ref}
      autoFocus
      defaultValue={initial}
      onBlur={() => {
        const v = ref.current?.value.trim() ?? "";
        if (v && v !== initial) onSave(v);
        else onCancel();
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          const v = ref.current?.value.trim() ?? "";
          if (v) onSave(v);
          else onCancel();
        }
        if (e.key === "Escape") onCancel();
      }}
      className="min-w-0 flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-1 text-sm text-zinc-100 outline-none focus:border-cyan-500"
    />
  );
}

function ConfidencePicker({
  objective,
  start,
  pending,
}: {
  objective: Objective;
  start: React.TransitionStartFunction;
  pending: boolean;
}) {
  return (
    <div className="flex items-center gap-1">
      <span className={`h-2 w-2 rounded-full ${CONFIDENCE_META[objective.confidence].dot}`} aria-hidden />
      <select
        aria-label="Confidence"
        value={objective.confidence}
        onChange={(e) => start(() => setConfidence(objective.id, e.target.value))}
        disabled={pending}
        className="rounded-lg border border-zinc-700 bg-zinc-900 px-1.5 py-1 text-xs text-zinc-300 outline-none focus:border-cyan-500"
      >
        {CONFIDENCES.map((c) => (
          <option key={c} value={c}>
            {CONFIDENCE_META[cleanConfidence(c)].label}
          </option>
        ))}
      </select>
    </div>
  );
}

function CycleEditor({
  objective,
  start,
}: {
  objective: Objective;
  start: React.TransitionStartFunction;
}) {
  const [editing, setEditing] = useState(false);
  const ref = useRef<HTMLInputElement>(null);

  if (editing) {
    return (
      <input
        ref={ref}
        autoFocus
        defaultValue={objective.cycle}
        placeholder="Cycle"
        onBlur={() => {
          start(() => setCycle(objective.id, ref.current?.value ?? ""));
          setEditing(false);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            start(() => setCycle(objective.id, ref.current?.value ?? ""));
            setEditing(false);
          }
          if (e.key === "Escape") setEditing(false);
        }}
        className="w-28 rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-100 outline-none focus:border-cyan-500"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className="text-[11px] text-zinc-500 hover:text-cyan-300"
    >
      {objective.cycle ? "Edit cycle" : "Set cycle"}
    </button>
  );
}

function KeyResultList({ objectiveId, krs }: { objectiveId: number; krs: KeyResult[] }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, start] = useTransition();
  const atMax = krs.length >= 5;

  function submit(formData: FormData) {
    const title = String(formData.get("kr") || "").trim();
    if (!title) return;
    const target = Number(formData.get("target")) || 100;
    start(async () => {
      await addKeyResult(objectiveId, title, target);
      formRef.current?.reset();
    });
  }

  return (
    <div className="space-y-2">
      {krs.length > 0 && (
        <ul className="space-y-2">
          {krs.map((kr) => (
            <KeyResultRow key={kr.id} kr={kr} />
          ))}
        </ul>
      )}
      {atMax ? (
        <p className="text-[11px] italic text-zinc-500">Max 5 key results per objective.</p>
      ) : (
        <form ref={formRef} action={submit} className="flex items-center gap-2">
          <input
            name="kr"
            autoComplete="off"
            placeholder="+ key result"
            className="min-w-0 flex-1 rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-1.5 text-xs text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-cyan-500/60"
          />
          <input
            name="target"
            type="number"
            inputMode="decimal"
            defaultValue={100}
            aria-label="Target"
            className="w-16 rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-1.5 text-xs text-zinc-100 outline-none focus:border-cyan-500/60"
          />
          <button
            type="submit"
            disabled={pending}
            className="shrink-0 rounded-lg border border-zinc-700 px-2.5 py-1.5 text-xs font-semibold text-zinc-300 hover:border-cyan-500 hover:text-cyan-300 disabled:opacity-50"
          >
            Add
          </button>
        </form>
      )}
    </div>
  );
}

function KeyResultRow({ kr }: { kr: KeyResult }) {
  const [pending, start] = useTransition();
  const [editing, setEditing] = useState(false);
  const percent = krPct(kr.current_value, kr.target_value);

  function commit(current: number, target: number) {
    start(() => updateKeyResult(kr.id, current, target));
  }

  return (
    <li className={`rounded-xl border border-zinc-800 bg-zinc-950/40 p-2 ${pending ? "opacity-60" : ""}`}>
      <div className="flex items-center gap-2">
        {editing ? (
          <input
            autoFocus
            defaultValue={kr.title}
            onBlur={(e) => {
              const v = e.target.value.trim();
              if (v && v !== kr.title) start(() => setKeyResultTitle(kr.id, v));
              setEditing(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
              if (e.key === "Escape") setEditing(false);
            }}
            className="min-w-0 flex-1 rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-100 outline-none focus:border-cyan-500"
          />
        ) : (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="min-w-0 flex-1 break-words text-left text-xs text-zinc-200 hover:text-cyan-300"
          >
            {kr.title}
          </button>
        )}
        <span className="shrink-0 text-xs font-semibold tabular-nums text-zinc-300">{percent}%</span>
        <button
          type="button"
          onClick={() => start(() => deleteKeyResult(kr.id))}
          disabled={pending}
          aria-label="Delete key result"
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-zinc-600 hover:bg-zinc-800 hover:text-rose-400"
        >
          <span className="text-sm leading-none">×</span>
        </button>
      </div>

      <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-zinc-800">
        <div className="h-full rounded-full bg-cyan-500 transition-all" style={{ width: `${percent}%` }} />
      </div>

      <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-zinc-500">
        <input
          type="number"
          inputMode="decimal"
          defaultValue={kr.current_value}
          aria-label="Current value"
          onBlur={(e) => commit(Number(e.target.value), kr.target_value)}
          className="w-16 rounded border border-zinc-800 bg-zinc-900 px-1.5 py-1 text-xs text-zinc-100 outline-none focus:border-cyan-500"
        />
        <span>/</span>
        <input
          type="number"
          inputMode="decimal"
          defaultValue={kr.target_value}
          aria-label="Target value"
          onBlur={(e) => commit(kr.current_value, Number(e.target.value))}
          className="w-16 rounded border border-zinc-800 bg-zinc-900 px-1.5 py-1 text-xs text-zinc-100 outline-none focus:border-cyan-500"
        />
      </div>
    </li>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-8 text-center">
      <div className="text-3xl text-zinc-600">◈</div>
      <p className="mt-2 text-sm text-zinc-300">No objectives yet.</p>
      <p className="text-xs text-zinc-500">
        Add a qualitative objective above, then give it 2–5 measurable key results. Its score is the
        average of theirs.
      </p>
    </div>
  );
}
