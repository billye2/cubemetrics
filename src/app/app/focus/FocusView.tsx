"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { saveFocusSessionAction, deleteFocusEntryAction } from "./actions";

const PRESETS = [25, 45, 60, 90];
const STORAGE_KEY = "xp.focus.active";

interface Entry {
  id: number;
  value: number | string;
  label: string | null;
  note: string | null;
  created_at: string;
}

interface ActiveSession {
  startedAt: number;
  durationMinutes: number;
  intent: string;
  distractions: string[];
}

export function FocusView({ entries }: { entries: Entry[] }) {
  const [active, setActive] = useState<ActiveSession | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<ActiveSession>;
        if (
          parsed &&
          typeof parsed.startedAt === "number" &&
          typeof parsed.durationMinutes === "number"
        ) {
          setActive({
            startedAt: parsed.startedAt,
            durationMinutes: parsed.durationMinutes,
            intent: parsed.intent ?? "",
            distractions: Array.isArray(parsed.distractions) ? parsed.distractions : [],
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
      <Intro />
      <Stats entries={entries} />
      {active ? (
        <ActiveTimer
          session={active}
          onPatch={(patch) => setActive((s) => (s ? { ...s, ...patch } : s))}
          onEnd={() => setActive(null)}
        />
      ) : (
        <Setup
          onStart={(intent, durationMinutes) =>
            setActive({
              startedAt: Date.now(),
              durationMinutes,
              intent,
              distractions: [],
            })
          }
        />
      )}
      <History entries={entries} />
    </div>
  );
}

function Intro() {
  return (
    <div className="mb-4 rounded-2xl border border-zinc-800 bg-zinc-900/30 p-3 text-xs text-zinc-400">
      <span className="font-semibold text-zinc-300">Stay on one thing</span>{" "}
      — set an intent, pick a duration, and let the timer keep you honest. Jot
      down distractions as they hit instead of chasing them. Reach for{" "}
      <span className="font-semibold text-cyan-400">Time Tracker</span> when you
      want to see where all your hours actually went.
    </div>
  );
}

function Setup({
  onStart,
}: {
  onStart: (intent: string, minutes: number) => void;
}) {
  const [minutes, setMinutes] = useState(45);
  const [custom, setCustom] = useState(false);
  const [intent, setIntent] = useState("");

  function go() {
    onStart(intent.trim(), minutes);
  }

  return (
    <div className="rounded-3xl border border-zinc-800 bg-zinc-900/40 p-6">
      <div className="text-center text-xs uppercase tracking-wider text-zinc-500">
        Set your focus
      </div>
      <div className="mt-2 text-center text-6xl font-bold tabular-nums tracking-tight text-zinc-100">
        {String(minutes).padStart(2, "0")}:00
      </div>

      <div className="mt-5 flex flex-wrap justify-center gap-2">
        {PRESETS.map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => {
              setMinutes(m);
              setCustom(false);
            }}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
              !custom && minutes === m
                ? "bg-cyan-500/20 text-cyan-300 ring-1 ring-cyan-500/40"
                : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
            }`}
          >
            {m}m
          </button>
        ))}
        <button
          type="button"
          onClick={() => setCustom(true)}
          className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
            custom
              ? "bg-cyan-500/20 text-cyan-300 ring-1 ring-cyan-500/40"
              : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
          }`}
        >
          Custom
        </button>
      </div>

      {custom && (
        <div className="mt-3 flex items-center justify-center gap-2">
          <input
            type="number"
            min={1}
            max={720}
            value={minutes}
            onChange={(e) => setMinutes(Math.max(1, Math.min(720, Number(e.target.value) || 1)))}
            className="w-24 rounded-lg bg-zinc-900 px-3 py-2 text-center text-base text-zinc-100 outline-none ring-1 ring-zinc-800 focus:ring-cyan-500/50"
          />
          <span className="text-sm text-zinc-400">minutes</span>
        </div>
      )}

      <input
        value={intent}
        onChange={(e) => setIntent(e.target.value)}
        autoComplete="off"
        placeholder="What are you focusing on?"
        className="mt-5 w-full rounded-lg bg-zinc-900 px-3 py-2 text-base text-zinc-100 placeholder:text-zinc-500 outline-none ring-1 ring-zinc-800 focus:ring-cyan-500/50"
      />

      <button
        type="button"
        onClick={go}
        className="mt-4 h-12 w-full rounded-xl bg-cyan-500 text-base font-semibold text-zinc-950 hover:bg-cyan-400"
      >
        Start {minutes}-minute focus
      </button>

      <p className="mt-3 text-center text-xs text-zinc-500">
        Pick something specific. One thing at a time.
      </p>
    </div>
  );
}

function ActiveTimer({
  session,
  onPatch,
  onEnd,
}: {
  session: ActiveSession;
  onPatch: (patch: Partial<ActiveSession>) => void;
  onEnd: () => void;
}) {
  const totalMs = session.durationMinutes * 60 * 1000;
  const endsAt = session.startedAt + totalMs;
  const [now, setNow] = useState(() => Date.now());
  const [pending, start] = useTransition();
  const savedRef = useRef(false);
  const distractionRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const remainingMs = Math.max(0, endsAt - now);
  const elapsedMs = Math.max(0, Math.min(totalMs, now - session.startedAt));
  const remainingSec = Math.floor(remainingMs / 1000);
  const mm = Math.floor(remainingSec / 60);
  const ss = remainingSec % 60;
  const pct = totalMs > 0 ? Math.min(100, Math.round((elapsedMs / totalMs) * 100)) : 0;
  const done = remainingMs === 0;

  useEffect(() => {
    if (!done || savedRef.current) return;
    savedRef.current = true;
    start(async () => {
      await saveFocusSessionAction(session.durationMinutes, session.intent, session.distractions);
      onEnd();
    });
  }, [done, session.durationMinutes, session.intent, session.distractions, onEnd, start]);

  function finishEarly() {
    const minutes = Math.max(1, Math.round(elapsedMs / 60000));
    savedRef.current = true;
    start(async () => {
      await saveFocusSessionAction(minutes, session.intent, session.distractions);
      onEnd();
    });
  }

  function cancel() {
    if (!confirm("Cancel this session? Nothing will be saved.")) return;
    savedRef.current = true;
    onEnd();
  }

  function addDistraction(e: React.FormEvent) {
    e.preventDefault();
    const text = distractionRef.current?.value.trim();
    if (!text) return;
    onPatch({ distractions: [...session.distractions, text] });
    if (distractionRef.current) distractionRef.current.value = "";
  }

  function removeDistraction(i: number) {
    onPatch({ distractions: session.distractions.filter((_, idx) => idx !== i) });
  }

  return (
    <div className="rounded-3xl border border-zinc-800 bg-zinc-900/40 p-6">
      {session.intent ? (
        <div className="mb-1 text-center text-sm font-semibold text-cyan-400">
          {session.intent}
        </div>
      ) : (
        <div className="mb-1 text-center text-sm font-semibold text-zinc-500">
          Deep work
        </div>
      )}
      <div className="text-center text-xs uppercase tracking-wider text-zinc-500">
        {done ? "Saving…" : "In focus"}
      </div>
      <div
        className={`mt-2 text-center text-7xl font-bold tabular-nums tracking-tight ${
          done ? "text-emerald-400" : "text-zinc-100"
        }`}
      >
        {String(mm).padStart(2, "0")}:{String(ss).padStart(2, "0")}
      </div>
      <div className="mx-auto mt-4 h-2 w-full max-w-xs overflow-hidden rounded-full bg-zinc-800">
        <div
          className={`h-full rounded-full transition-all ${done ? "bg-emerald-500" : "bg-cyan-500"}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="mt-6">
        <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
          Distractions ({session.distractions.length})
        </div>
        <form onSubmit={addDistraction} className="flex gap-2">
          <input
            ref={distractionRef}
            placeholder="Notice a distraction? Park it here."
            className="flex-1 rounded-lg bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none ring-1 ring-zinc-800 focus:ring-cyan-500/50"
          />
          <button
            type="submit"
            className="rounded-lg bg-zinc-800 px-3 text-sm font-semibold text-zinc-300 hover:bg-zinc-700"
          >
            +
          </button>
        </form>
        {session.distractions.length > 0 && (
          <ul className="mt-2 space-y-1">
            {session.distractions.map((d, i) => (
              <li
                key={i}
                className="flex items-center gap-2 rounded-lg bg-zinc-900/60 px-3 py-1.5 text-xs text-zinc-300"
              >
                <span className="flex-1 truncate">{d}</span>
                <button
                  type="button"
                  onClick={() => removeDistraction(i)}
                  className="text-zinc-600 hover:text-red-400"
                  aria-label="Remove"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {!done && (
        <div className="mt-6 flex justify-center gap-3">
          <button
            type="button"
            onClick={cancel}
            disabled={pending}
            className="rounded-xl bg-zinc-800 px-5 py-2.5 text-sm font-semibold text-zinc-300 hover:bg-zinc-700 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={finishEarly}
            disabled={pending}
            className="rounded-xl bg-cyan-500 px-5 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-cyan-400 disabled:opacity-50"
          >
            Finish early
          </button>
        </div>
      )}
    </div>
  );
}

function Stats({ entries }: { entries: Entry[] }) {
  const buckets = bucketByDay(entries, 7);
  const todayMinutes = buckets[buckets.length - 1].minutes;
  const streak = computeStreak(entries);
  const max = Math.max(1, ...buckets.map((b) => b.minutes));

  return (
    <div className="mb-5 rounded-3xl border border-zinc-800 bg-zinc-900/40 p-5">
      <div className="grid grid-cols-2 gap-4">
        <Stat label="Today" value={formatMinutes(todayMinutes)} />
        <Stat
          label="Streak"
          value={streak > 0 ? `${streak}` : "—"}
          suffix={streak > 0 ? (streak === 1 ? "day" : "days") : "start one"}
        />
      </div>
      <div className="mt-5">
        <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
          Last 7 days
        </div>
        <div className="flex h-20 items-end gap-1.5">
          {buckets.map((b) => {
            const h = b.minutes === 0 ? 4 : Math.max(6, Math.round((b.minutes / max) * 100));
            return (
              <div key={b.key} className="flex flex-1 flex-col items-center gap-1">
                <div
                  title={`${b.label}: ${formatMinutes(b.minutes)}`}
                  className={`w-full rounded-md transition-all ${
                    b.minutes === 0
                      ? "bg-zinc-800"
                      : b.isToday
                      ? "bg-cyan-400"
                      : "bg-cyan-500/50"
                  }`}
                  style={{ height: `${h}%` }}
                />
                <div className={`text-[10px] ${b.isToday ? "text-cyan-300" : "text-zinc-500"}`}>
                  {b.short}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, suffix }: { label: string; value: string; suffix?: string }) {
  return (
    <div className="rounded-2xl bg-zinc-900/60 p-3 text-center">
      <div className="text-2xl font-bold tracking-tight text-cyan-400">{value}</div>
      <div className="text-xs text-zinc-500">{suffix ?? label}</div>
    </div>
  );
}

function History({ entries }: { entries: Entry[] }) {
  const recent = entries.slice(0, 20);
  return (
    <div className="mt-6">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
        Recent sessions
      </h3>
      {recent.length === 0 ? (
        <p className="text-sm text-zinc-500">No sessions yet. Start your first focus block above.</p>
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

function SessionRow({ entry }: { entry: Entry }) {
  const [pending, start] = useTransition();
  const date = new Date(entry.created_at);
  const dateLabel = date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  const timeLabel = date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  const minutes = Number(entry.value) || 0;

  function remove() {
    if (!confirm("Delete this session?")) return;
    start(() => deleteFocusEntryAction(entry.id));
  }

  return (
    <li
      className={`flex items-start gap-3 rounded-xl border border-zinc-800 bg-zinc-900/40 px-3 py-2 ${
        pending ? "opacity-50" : ""
      }`}
    >
      <div className="w-16 shrink-0 text-xs text-zinc-500">
        <div>{dateLabel}</div>
        <div className="text-zinc-600">{timeLabel}</div>
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-zinc-100">
          {entry.label || "Deep work"}
        </div>
        {entry.note && (
          <div className="mt-0.5 truncate text-xs text-zinc-400">
            {entry.note.split(" | ").length} distraction{entry.note.split(" | ").length === 1 ? "" : "s"} logged
          </div>
        )}
      </div>
      <div className="text-sm font-semibold text-cyan-400">{minutes}m</div>
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

function formatMinutes(m: number): string {
  if (m === 0) return "0m";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem === 0 ? `${h}h` : `${h}h ${rem}m`;
}

function localDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function bucketByDay(entries: Entry[], days: number) {
  const todayKey = localDateKey(new Date());
  const minutesByDay = new Map<string, number>();
  for (const e of entries) {
    const key = localDateKey(new Date(e.created_at));
    minutesByDay.set(key, (minutesByDay.get(key) ?? 0) + (Number(e.value) || 0));
  }
  const out: { key: string; label: string; short: string; minutes: number; isToday: boolean }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = localDateKey(d);
    out.push({
      key,
      label: d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }),
      short: d.toLocaleDateString(undefined, { weekday: "narrow" }),
      minutes: minutesByDay.get(key) ?? 0,
      isToday: key === todayKey,
    });
  }
  return out;
}

function computeStreak(entries: Entry[]): number {
  if (entries.length === 0) return 0;
  const days = new Set(entries.map((e) => localDateKey(new Date(e.created_at))));
  let streak = 0;
  const cursor = new Date();
  if (!days.has(localDateKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
    if (!days.has(localDateKey(cursor))) return 0;
  }
  while (days.has(localDateKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}
