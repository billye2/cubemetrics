"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import type { CounterWithStats, DayBucket } from "./page";
import {
  adjustCounter,
  createCounter,
  deleteCounter,
  renameCounter,
  resetCounter,
  setStep,
} from "./actions";

export function CounterView({
  counters,
  chart,
  tapsToday,
  weekTaps,
  busiest,
}: {
  counters: CounterWithStats[];
  chart: DayBucket[];
  tapsToday: number;
  weekTaps: number;
  busiest: string | null;
}) {
  return (
    <div className="space-y-6">
      <Hero tapsToday={tapsToday} chart={chart} />
      {counters.length > 0 && (
        <StatsStrip count={counters.length} weekTaps={weekTaps} busiest={busiest} />
      )}
      <AddCounterForm />
      {counters.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {counters.map((c) => (
            <CounterCard key={c.id} counter={c} />
          ))}
        </div>
      )}
    </div>
  );
}

function Hero({ tapsToday, chart }: { tapsToday: number; chart: DayBucket[] }) {
  const max = Math.max(1, ...chart.map((d) => d.count));
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="text-5xl font-bold tabular-nums text-cyan-400">{tapsToday}</div>
          <div className="mt-1 text-xs font-medium uppercase tracking-wider text-zinc-500">
            {tapsToday === 1 ? "tap today" : "taps today"}
          </div>
        </div>
        <div className="flex h-16 items-end gap-1.5">
          {chart.map((d, i) => (
            <div key={i} className="flex w-4 flex-col items-center gap-1">
              <div className="flex h-12 w-full items-end">
                <div
                  className="w-full rounded-sm bg-cyan-500/70 motion-safe:transition-[height]"
                  style={{ height: `${(d.count / max) * 100}%` }}
                  title={`${d.count}`}
                />
              </div>
              <span className="text-[10px] text-zinc-600">{d.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatsStrip({
  count,
  weekTaps,
  busiest,
}: {
  count: number;
  weekTaps: number;
  busiest: string | null;
}) {
  return (
    <div className="grid grid-cols-3 gap-2">
      <Stat label="Counters" value={String(count)} />
      <Stat label="This week" value={String(weekTaps)} />
      <Stat label="Busiest" value={busiest ?? "—"} />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 px-3 py-3 text-center">
      <div className="truncate text-base font-semibold text-zinc-100" title={value}>
        {value}
      </div>
      <div className="mt-0.5 text-[10px] font-medium uppercase tracking-wider text-zinc-500">
        {label}
      </div>
    </div>
  );
}

function AddCounterForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, start] = useTransition();

  function submit(formData: FormData) {
    const name = String(formData.get("name") || "").trim();
    const step = Number(formData.get("step") || 1);
    if (!name) return;
    start(async () => {
      await createCounter(name, step);
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
        name="name"
        autoComplete="off"
        placeholder="New counter…"
        className="min-w-0 flex-1 bg-transparent px-2 py-2 text-base text-zinc-100 placeholder:text-zinc-500 outline-none"
      />
      <input
        name="step"
        type="number"
        min={1}
        defaultValue={1}
        aria-label="Step"
        className="w-14 rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-2 text-center text-sm text-zinc-200 outline-none focus:border-cyan-500"
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

const STEP_PRESETS = [1, 5, 10];

function CounterCard({ counter }: { counter: CounterWithStats }) {
  const [, start] = useTransition();
  // Optimistic value so rapid taps feel instant; resync when the server confirms.
  const [value, setValue] = useState(counter.value);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(counter.name);
  const [showStep, setShowStep] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => setValue(counter.value), [counter.value]);
  useEffect(() => setName(counter.name), [counter.name]);

  function bump(sign: 1 | -1) {
    setValue((v) => v + sign * counter.step);
    start(() => adjustCounter(counter.id, sign));
  }

  function saveName() {
    const trimmed = name.trim();
    setEditing(false);
    if (!trimmed || trimmed === counter.name) {
      setName(counter.name);
      return;
    }
    start(() => renameCounter(counter.id, trimmed));
  }

  function pickStep(s: number) {
    setShowStep(false);
    if (s !== counter.step) start(() => setStep(counter.id, s));
  }

  function reset() {
    setMenuOpen(false);
    if (counter.value === 0) return;
    if (!confirm(`Reset "${counter.name}" to zero?`)) return;
    setValue(0);
    start(() => resetCounter(counter.id));
  }

  function remove() {
    setMenuOpen(false);
    if (!confirm(`Delete "${counter.name}"?`)) return;
    start(() => deleteCounter(counter.id));
  }

  return (
    <div className="relative flex flex-col rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
      {/* Header: name + overflow menu */}
      <div className="flex items-start justify-between gap-2">
        {editing ? (
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={saveName}
            onKeyDown={(e) => {
              if (e.key === "Enter") saveName();
              if (e.key === "Escape") {
                setName(counter.name);
                setEditing(false);
              }
            }}
            className="min-w-0 flex-1 rounded-md border border-cyan-500/60 bg-zinc-900 px-2 py-1 text-sm text-zinc-100 outline-none"
          />
        ) : (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="min-w-0 flex-1 break-words text-left text-sm font-medium text-zinc-200 hover:text-cyan-300"
            title="Rename"
          >
            {counter.name}
          </button>
        )}
        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="Counter options"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
          >
            <span className="text-lg leading-none">⋯</span>
          </button>
          {menuOpen && (
            <>
              <button
                type="button"
                aria-hidden
                tabIndex={-1}
                onClick={() => setMenuOpen(false)}
                className="fixed inset-0 z-10 cursor-default"
              />
              <div className="absolute right-0 z-20 mt-1 w-32 overflow-hidden rounded-xl border border-zinc-700 bg-zinc-900 shadow-xl">
                <MenuItem onClick={() => { setMenuOpen(false); setEditing(true); }}>Rename</MenuItem>
                <MenuItem onClick={reset}>Reset to 0</MenuItem>
                <MenuItem onClick={remove} danger>Delete</MenuItem>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Value + controls */}
      <div className="mt-3 flex items-center justify-between gap-2">
        <StepButton label="−" onClick={() => bump(-1)} />
        <div className="flex min-w-0 flex-col items-center">
          <span className="text-4xl font-bold tabular-nums text-zinc-50">{value}</span>
          {counter.todayNet !== 0 && (
            <span
              className={`text-xs font-medium ${
                counter.todayNet > 0 ? "text-cyan-400" : "text-zinc-500"
              }`}
            >
              {counter.todayNet > 0 ? "+" : ""}
              {counter.todayNet} today
            </span>
          )}
        </div>
        <StepButton label="+" onClick={() => bump(1)} primary />
      </div>

      {/* Step picker */}
      <div className="mt-3 flex justify-center">
        {showStep ? (
          <div className="flex items-center gap-1">
            {STEP_PRESETS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => pickStep(s)}
                className={`min-h-[32px] rounded-lg px-3 text-xs font-semibold ${
                  s === counter.step
                    ? "bg-cyan-500 text-zinc-950"
                    : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                }`}
              >
                {s}
              </button>
            ))}
            <CustomStep current={counter.step} onPick={pickStep} />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowStep(true)}
            className="text-xs text-zinc-500 hover:text-cyan-300"
          >
            step {counter.step} ·{" "}
            <span className="underline decoration-dotted">change</span>
          </button>
        )}
      </div>
    </div>
  );
}

function StepButton({
  label,
  onClick,
  primary,
}: {
  label: string;
  onClick: () => void;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label === "+" ? "Increment" : "Decrement"}
      className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-3xl font-bold transition active:scale-95 ${
        primary
          ? "bg-cyan-500 text-zinc-950 hover:bg-cyan-400"
          : "border-2 border-zinc-700 text-zinc-200 hover:border-zinc-500 hover:bg-zinc-800"
      }`}
    >
      {label}
    </button>
  );
}

function CustomStep({
  current,
  onPick,
}: {
  current: number;
  onPick: (s: number) => void;
}) {
  const isPreset = STEP_PRESETS.includes(current);
  return (
    <input
      type="number"
      min={1}
      defaultValue={isPreset ? "" : current}
      placeholder="…"
      aria-label="Custom step"
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          const v = Number((e.target as HTMLInputElement).value);
          if (v > 0) onPick(Math.floor(v));
        }
      }}
      onBlur={(e) => {
        const v = Number(e.target.value);
        if (v > 0 && Math.floor(v) !== current) onPick(Math.floor(v));
      }}
      className="w-12 rounded-lg border border-zinc-700 bg-zinc-900 px-1 py-1 text-center text-xs text-zinc-200 outline-none focus:border-cyan-500"
    />
  );
}

function MenuItem({
  children,
  onClick,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`block w-full px-3 py-2 text-left text-sm hover:bg-zinc-800 ${
        danger ? "text-red-400" : "text-zinc-200"
      }`}
    >
      {children}
    </button>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-8 text-center">
      <div className="text-3xl text-zinc-600">#</div>
      <p className="mt-2 text-sm text-zinc-300">No counters yet.</p>
      <p className="text-xs text-zinc-500">
        Add one above — reps, scores, head-counts, anything you want to tally.
      </p>
    </div>
  );
}
