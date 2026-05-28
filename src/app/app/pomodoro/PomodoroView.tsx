"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { startSessionAction, completeSessionAction, cancelSessionAction } from "./actions";

interface Session {
  id: number;
  started_at: string;
  duration_minutes: number;
  label: string | null;
}

interface RecentSession extends Session {
  completed_at: string | null;
}

const PRESETS = [15, 25, 45, 60];

export function PomodoroView({
  active,
  todayCount,
  recent,
}: {
  active: Session | null;
  todayCount: number;
  recent: RecentSession[];
}) {
  return (
    <div>
      <div className="mb-4 flex items-center justify-center gap-6 rounded-2xl border border-zinc-800 bg-zinc-900/40 px-4 py-3">
        <Stat label="Today" value={String(todayCount)} suffix={todayCount === 1 ? "pomodoro" : "pomodoros"} />
      </div>

      {active ? <ActiveTimer session={active} /> : <StartForm />}

      {recent.length > 0 && (
        <div className="mt-8">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">Recent</h3>
          <ul className="space-y-2">
            {recent.map((s) => (
              <RecentRow key={s.id} session={s} />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, suffix }: { label: string; value: string; suffix?: string }) {
  return (
    <div className="text-center">
      <div className="text-2xl font-bold tracking-tight text-cyan-400">{value}</div>
      <div className="text-xs text-zinc-500">{suffix ?? label}</div>
    </div>
  );
}

function ActiveTimer({ session }: { session: Session }) {
  const started = new Date(session.started_at).getTime();
  const totalMs = session.duration_minutes * 60 * 1000;
  const endsAt = started + totalMs;

  const [now, setNow] = useState(() => Date.now());
  const [pending, start] = useTransition();
  const completedFiredRef = useRef(false);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const remainingMs = Math.max(0, endsAt - now);
  const remainingSec = Math.floor(remainingMs / 1000);
  const mm = Math.floor(remainingSec / 60);
  const ss = remainingSec % 60;
  const pct = totalMs > 0 ? Math.min(100, Math.round(((totalMs - remainingMs) / totalMs) * 100)) : 0;
  const done = remainingMs === 0;

  useEffect(() => {
    if (done && !completedFiredRef.current) {
      completedFiredRef.current = true;
      // Auto-complete the session on the server
      start(() => completeSessionAction(session.id));
    }
  }, [done, session.id, start]);

  function finish() {
    start(() => completeSessionAction(session.id));
  }
  function cancel() {
    if (!confirm("Cancel this session?")) return;
    start(() => cancelSessionAction(session.id));
  }

  return (
    <div className="flex flex-col items-center rounded-3xl border border-zinc-800 bg-zinc-900/40 p-8">
      {session.label && (
        <div className="mb-1 text-sm font-semibold text-cyan-400">{session.label}</div>
      )}
      <div className="mb-3 text-xs uppercase tracking-wider text-zinc-500">
        {done ? "Done!" : "In session"}
      </div>
      <div className={`text-7xl font-bold tabular-nums tracking-tight ${done ? "text-emerald-400" : "text-zinc-100"}`}>
        {String(mm).padStart(2, "0")}:{String(ss).padStart(2, "0")}
      </div>
      <div className="mt-4 h-2 w-full max-w-xs overflow-hidden rounded-full bg-zinc-800">
        <div
          className={`h-full rounded-full transition-all ${done ? "bg-emerald-500" : "bg-cyan-500"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="mt-6 flex gap-3">
        <button
          type="button"
          onClick={cancel}
          disabled={pending}
          className="rounded-xl bg-zinc-800 px-5 py-2.5 text-sm font-semibold text-zinc-300 hover:bg-zinc-700 disabled:opacity-50"
        >
          Cancel
        </button>
        {!done && (
          <button
            type="button"
            onClick={finish}
            disabled={pending}
            className="rounded-xl bg-cyan-500 px-5 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-cyan-400 disabled:opacity-50"
          >
            Finish early
          </button>
        )}
      </div>
    </div>
  );
}

function StartForm() {
  const [minutes, setMinutes] = useState(25);
  const [label, setLabel] = useState("");
  const [pending, start] = useTransition();

  function go() {
    start(() => startSessionAction(minutes, label.trim()));
  }

  return (
    <div className="rounded-3xl border border-zinc-800 bg-zinc-900/40 p-6">
      <div className="text-center text-xs uppercase tracking-wider text-zinc-500">Set timer</div>
      <div className="mt-2 text-center text-6xl font-bold tabular-nums tracking-tight text-zinc-100">
        {String(minutes).padStart(2, "0")}:00
      </div>

      <div className="mt-5 flex justify-center gap-2">
        {PRESETS.map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMinutes(m)}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
              minutes === m
                ? "bg-cyan-500/20 text-cyan-300 ring-1 ring-cyan-500/40"
                : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
            }`}
          >
            {m}m
          </button>
        ))}
      </div>

      <input
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        autoComplete="off"
        placeholder="What are you focusing on? (optional)"
        className="mt-5 w-full rounded-lg bg-zinc-900 px-3 py-2 text-base text-zinc-100 placeholder:text-zinc-500 outline-none ring-1 ring-zinc-800 focus:ring-cyan-500/50"
      />

      <button
        type="button"
        onClick={go}
        disabled={pending}
        className="mt-4 h-12 w-full rounded-xl bg-cyan-500 text-base font-semibold text-zinc-950 hover:bg-cyan-400 disabled:opacity-50"
      >
        {pending ? "Starting…" : `Start ${minutes}-minute timer`}
      </button>
    </div>
  );
}

function RecentRow({ session }: { session: RecentSession }) {
  const startedAt = new Date(session.started_at);
  const date = startedAt.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  const time = startedAt.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });

  return (
    <li className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/40 px-3 py-2">
      <div className="w-16 text-xs text-zinc-500">
        <div>{date}</div>
        <div className="text-zinc-600">{time}</div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm text-zinc-100">
          {session.label || `${session.duration_minutes}-minute session`}
        </div>
      </div>
      <div className="text-xs font-semibold text-cyan-400">{session.duration_minutes}m</div>
    </li>
  );
}
