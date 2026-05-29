"use client";

import { useEffect, useState, useTransition } from "react";
import { logStopwatchAction, deleteStopwatchAction } from "./actions";
import {
  type TrackerEntry,
  bucketByDay,
  todayAggregate,
  computeStreak,
} from "../_factories/trackerLib";

const STORAGE_KEY = "xp.stopwatch.active";

interface ActiveStopwatch {
  /** Epoch ms of the current run; null while paused. */
  startedAt: number | null;
  /** Milliseconds banked before the current run (for pause/resume). */
  accumulatedMs: number;
  label: string;
  /** Elapsed-ms snapshots taken at each lap. */
  laps: number[];
}

function elapsedOf(s: ActiveStopwatch, now: number): number {
  return s.accumulatedMs + (s.startedAt != null ? Math.max(0, now - s.startedAt) : 0);
}

function formatElapsed(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

function formatMinutes(m: number): string {
  if (m <= 0) return "0m";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem === 0 ? `${h}h` : `${h}h ${rem}m`;
}

export function StopwatchView({ entries }: { entries: TrackerEntry[] }) {
  const [active, setActive] = useState<ActiveStopwatch | null>(null);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate the in-progress timer from localStorage (survives reloads, like Focus).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const p = JSON.parse(raw) as Partial<ActiveStopwatch>;
        if (p && typeof p.accumulatedMs === "number") {
          // SSR-safe hydration: localStorage is only readable after mount, so the
          // restore must happen in this effect (same pattern as Focus/Pomodoro).
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setActive({
            startedAt: typeof p.startedAt === "number" ? p.startedAt : null,
            accumulatedMs: p.accumulatedMs,
            label: typeof p.label === "string" ? p.label : "",
            laps: Array.isArray(p.laps) ? p.laps : [],
          });
        }
      }
    } catch {
      // ignore malformed storage
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (active) localStorage.setItem(STORAGE_KEY, JSON.stringify(active));
    else localStorage.removeItem(STORAGE_KEY);
  }, [active, hydrated]);

  if (!hydrated) {
    return <div className="h-72 animate-pulse rounded-3xl bg-zinc-900/40" />;
  }

  return (
    <div>
      <Stats entries={entries} />
      {active ? (
        <RunningCard
          session={active}
          onPatch={(patch) => setActive((s) => (s ? { ...s, ...patch } : s))}
          onEnd={() => setActive(null)}
        />
      ) : (
        <StartCard
          onStart={(label) =>
            setActive({ startedAt: Date.now(), accumulatedMs: 0, label, laps: [] })
          }
        />
      )}
      <History entries={entries} />
    </div>
  );
}

function StartCard({ onStart }: { onStart: (label: string) => void }) {
  const [label, setLabel] = useState("");
  return (
    <div className="rounded-3xl border border-zinc-800 bg-zinc-900/40 p-6">
      <div className="text-center text-xs uppercase tracking-wider text-zinc-500">Stopwatch</div>
      <div className="mt-2 text-center text-6xl font-bold tabular-nums tracking-tight text-zinc-100">
        00:00
      </div>
      <input
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        autoComplete="off"
        placeholder="What are you timing? (optional)"
        className="mt-5 w-full rounded-lg bg-zinc-900 px-3 py-2 text-base text-zinc-100 placeholder:text-zinc-500 outline-none ring-1 ring-zinc-800 focus:ring-cyan-500/50"
      />
      <button
        type="button"
        onClick={() => onStart(label.trim())}
        className="mt-4 h-12 w-full rounded-xl bg-cyan-500 text-base font-semibold text-zinc-950 hover:bg-cyan-400"
      >
        Start
      </button>
      <p className="mt-3 text-center text-xs text-zinc-500">
        Counts up live. Stop to log the elapsed minutes.
      </p>
    </div>
  );
}

function RunningCard({
  session,
  onPatch,
  onEnd,
}: {
  session: ActiveStopwatch;
  onPatch: (patch: Partial<ActiveStopwatch>) => void;
  onEnd: () => void;
}) {
  const running = session.startedAt != null;
  const [now, setNow] = useState(() => Date.now());
  const [pending, start] = useTransition();

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [running]);

  const elapsed = elapsedOf(session, now);

  function pause() {
    onPatch({ accumulatedMs: elapsedOf(session, Date.now()), startedAt: null });
  }
  function resume() {
    onPatch({ startedAt: Date.now() });
  }
  function lap() {
    onPatch({ laps: [...session.laps, elapsedOf(session, Date.now())] });
  }
  function reset() {
    if (!confirm("Reset the stopwatch? Nothing will be logged.")) return;
    onEnd();
  }
  function stopAndLog() {
    const minutes = Math.round(elapsedOf(session, Date.now()) / 60000);
    if (minutes < 1) {
      if (!confirm("Less than a minute elapsed — discard without logging?")) return;
      onEnd();
      return;
    }
    start(async () => {
      await logStopwatchAction(minutes, session.label);
      onEnd();
    });
  }

  return (
    <div className="rounded-3xl border border-zinc-800 bg-zinc-900/40 p-6">
      <div className={`mb-1 text-center text-sm font-semibold ${session.label ? "text-cyan-400" : "text-zinc-500"}`}>
        {session.label || "Timing"}
      </div>
      <div className="text-center text-xs uppercase tracking-wider text-zinc-500">
        {running ? "Running" : "Paused"}
      </div>
      <div
        className={`mt-2 text-center text-7xl font-bold tabular-nums tracking-tight ${
          running ? "text-zinc-100" : "text-amber-300"
        }`}
      >
        {formatElapsed(elapsed)}
      </div>

      <div className="mt-6 flex justify-center gap-3">
        {running ? (
          <>
            <button
              type="button"
              onClick={lap}
              className="rounded-xl bg-zinc-800 px-5 py-2.5 text-sm font-semibold text-zinc-300 hover:bg-zinc-700"
            >
              Lap
            </button>
            <button
              type="button"
              onClick={pause}
              className="rounded-xl bg-zinc-800 px-5 py-2.5 text-sm font-semibold text-zinc-300 hover:bg-zinc-700"
            >
              Pause
            </button>
            <button
              type="button"
              onClick={stopAndLog}
              disabled={pending}
              className="rounded-xl bg-cyan-500 px-5 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-cyan-400 disabled:opacity-50"
            >
              Stop &amp; log
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={resume}
              className="rounded-xl bg-cyan-500 px-5 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-cyan-400"
            >
              Resume
            </button>
            <button
              type="button"
              onClick={stopAndLog}
              disabled={pending}
              className="rounded-xl bg-zinc-800 px-5 py-2.5 text-sm font-semibold text-zinc-300 hover:bg-zinc-700 disabled:opacity-50"
            >
              Stop &amp; log
            </button>
          </>
        )}
      </div>
      <div className="mt-3 text-center">
        <button
          type="button"
          onClick={reset}
          className="text-xs font-semibold text-zinc-500 hover:text-red-400"
        >
          Reset
        </button>
      </div>

      {session.laps.length > 0 && (
        <div className="mt-6">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Laps ({session.laps.length})
          </div>
          <ul className="space-y-1">
            {session.laps.map((lapMs, i) => {
              const prev = i > 0 ? session.laps[i - 1] : 0;
              return (
                <li
                  key={i}
                  className="flex items-center justify-between rounded-lg bg-zinc-900/60 px-3 py-1.5 text-xs"
                >
                  <span className="text-zinc-500">Lap {i + 1}</span>
                  <span className="tabular-nums text-zinc-300">+{formatElapsed(lapMs - prev)}</span>
                  <span className="tabular-nums text-zinc-500">{formatElapsed(lapMs)}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

function Stats({ entries }: { entries: TrackerEntry[] }) {
  const buckets = bucketByDay(entries, 7, "sum");
  const today = todayAggregate(entries, "sum") ?? 0;
  const streak = computeStreak(entries);
  const max = Math.max(1, ...buckets.map((b) => b.value));

  return (
    <div className="mb-5 rounded-3xl border border-zinc-800 bg-zinc-900/40 p-5">
      <div className="grid grid-cols-2 gap-4">
        <Stat label="Logged today" value={formatMinutes(today)} />
        <Stat
          label={streak > 0 ? (streak === 1 ? "day streak" : "day streak") : "streak"}
          value={streak > 0 ? String(streak) : "—"}
        />
      </div>
      <div className="mt-5">
        <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
          Last 7 days
        </div>
        <div className="flex h-20 items-end gap-1.5">
          {buckets.map((b) => {
            const h = b.value === 0 ? 4 : Math.max(6, Math.round((b.value / max) * 100));
            return (
              <div
                key={b.key}
                title={`${b.label}: ${formatMinutes(b.value)}`}
                className={`w-full flex-1 rounded-md transition-all motion-reduce:transition-none ${
                  b.value === 0 ? "bg-zinc-800" : b.isToday ? "bg-cyan-400" : "bg-cyan-500/50"
                }`}
                style={{ height: `${h}%` }}
              />
            );
          })}
        </div>
        <div className="mt-1 flex gap-1.5">
          {buckets.map((b) => (
            <div
              key={b.key}
              className={`flex-1 text-center text-[10px] ${b.isToday ? "text-cyan-300" : "text-zinc-500"}`}
            >
              {b.short}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-zinc-900/60 p-3 text-center">
      <div className="text-2xl font-bold tracking-tight text-cyan-400">{value}</div>
      <div className="text-xs text-zinc-500">{label}</div>
    </div>
  );
}

function History({ entries }: { entries: TrackerEntry[] }) {
  const recent = entries.slice(0, 20);
  return (
    <div className="mt-6">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
        Recent times
      </h3>
      {recent.length === 0 ? (
        <p className="text-sm text-zinc-500">No times logged yet. Start the stopwatch above.</p>
      ) : (
        <ul className="space-y-2">
          {recent.map((e) => (
            <SessionRow key={e.id} entry={e} />
          ))}
        </ul>
      )}
    </div>
  );
}

function SessionRow({ entry }: { entry: TrackerEntry }) {
  const [pending, start] = useTransition();
  const date = new Date(entry.created_at);
  const dateLabel = date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  const timeLabel = date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  const minutes = Number(entry.value) || 0;

  function remove() {
    if (!confirm("Delete this entry?")) return;
    start(() => deleteStopwatchAction(entry.id));
  }

  return (
    <li
      className={`flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/40 px-3 py-2 ${
        pending ? "opacity-50" : ""
      }`}
    >
      <div className="w-16 shrink-0 text-xs text-zinc-500">
        <div>{dateLabel}</div>
        <div className="text-zinc-600">{timeLabel}</div>
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-zinc-100">{entry.note || "Stopwatch"}</div>
      </div>
      <div className="text-sm font-semibold text-cyan-400">{formatMinutes(minutes)}</div>
      <button
        type="button"
        onClick={remove}
        className="rounded-lg p-1 text-zinc-600 hover:bg-zinc-800 hover:text-red-400"
        aria-label="Delete"
      >
        ×
      </button>
    </li>
  );
}
