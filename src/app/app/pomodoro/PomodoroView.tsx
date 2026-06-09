"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { startSessionAction, completeSessionAction, cancelSessionAction } from "./actions";
import { Ring, StatTile, StatStrip, StatusPill } from "../_factories/FactoryUI";

interface Session {
  id: number;
  started_at: string;
  duration_minutes: number;
  label: string | null;
}

interface RecentSession extends Session {
  completed_at: string | null;
}

interface DayBucket {
  short: string;
  label: string;
  count: number;
  isToday: boolean;
}

interface BreakState {
  endsAt: number;
  kind: "short" | "long";
  durationMin: number;
}

interface Settings {
  shortMin: number;
  longMin: number;
  perLong: number;
  dailyGoal: number;
  autoStart: boolean;
  sound: boolean;
}

const PRESETS = [15, 25, 45, 60];
const DEFAULT_SETTINGS: Settings = { shortMin: 5, longMin: 15, perLong: 4, dailyGoal: 8, autoStart: false, sound: true };
const SETTINGS_KEY = "pomodoro_settings";
const BREAK_KEY = "pomodoro_break";

// --- client-only effects: chime + browser notification on phase change ---

function playChime() {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const notes = [660, 880];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = freq;
      osc.type = "sine";
      const t = ctx.currentTime + i * 0.18;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.25, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.18);
    });
    setTimeout(() => ctx.close(), 800);
  } catch {
    /* audio unavailable — ignore */
  }
}

function notify(title: string, body: string) {
  try {
    if (typeof Notification !== "undefined" && Notification.permission === "granted") {
      new Notification(title, { body });
    }
  } catch {
    /* notifications unavailable — ignore */
  }
}

function requestNotify() {
  try {
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      Notification.requestPermission();
    }
  } catch {
    /* ignore */
  }
}

export function PomodoroView({
  active,
  todayCount,
  recent,
  week,
}: {
  active: Session | null;
  todayCount: number;
  recent: RecentSession[];
  week: DayBucket[];
}) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [breakState, setBreakState] = useState<BreakState | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [pending, start] = useTransition();
  const [lastLabel, setLastLabel] = useState("");

  // Load persisted settings + any in-flight break once on mount.
  useEffect(() => {
    try {
      const s = localStorage.getItem(SETTINGS_KEY);
      if (s) setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(s) });
      const b = localStorage.getItem(BREAK_KEY);
      if (b) {
        const parsed = JSON.parse(b) as BreakState;
        if (parsed.endsAt > Date.now()) setBreakState(parsed);
        else localStorage.removeItem(BREAK_KEY);
      }
    } catch {
      /* ignore corrupt storage */
    }
  }, []);

  const saveSettings = useCallback((next: Settings) => {
    setSettings(next);
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }, []);

  const beginBreak = useCallback(
    (kind: "short" | "long") => {
      const durationMin = kind === "long" ? settings.longMin : settings.shortMin;
      const bs: BreakState = { endsAt: Date.now() + durationMin * 60_000, kind, durationMin };
      setBreakState(bs);
      try {
        localStorage.setItem(BREAK_KEY, JSON.stringify(bs));
      } catch {
        /* ignore */
      }
      if (settings.sound) playChime();
      notify(kind === "long" ? "Long break" : "Break time", `Take ${durationMin} minutes.`);
    },
    [settings],
  );

  const clearBreak = useCallback(() => {
    setBreakState(null);
    try {
      localStorage.removeItem(BREAK_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  // Called when a work pomodoro completes (auto at zero, or "finish early").
  const onWorkComplete = useCallback(() => {
    const completedNow = todayCount + 1;
    const kind = completedNow % settings.perLong === 0 ? "long" : "short";
    beginBreak(kind);
  }, [todayCount, settings.perLong, beginBreak]);

  // Called when a break finishes.
  const onBreakComplete = useCallback(() => {
    clearBreak();
    if (settings.sound) playChime();
    notify("Break over", "Ready for the next pomodoro?");
    if (settings.autoStart) {
      start(() => startSessionAction(25, lastLabel));
    }
  }, [clearBreak, settings.sound, settings.autoStart, lastLabel, start]);

  const cycleProgress = todayCount % settings.perLong;

  return (
    <div>
      {(() => {
        const goal = settings.dailyGoal;
        const done = goal > 0 && todayCount >= goal;
        return (
          <>
            <StatStrip cols={3}>
              <StatTile
                label="Today"
                value={`${todayCount}/${goal}`}
                tone={done ? "emerald" : "cyan"}
              />
              <StatTile label="This week" value={String(week.reduce((a, d) => a + d.count, 0))} />
              <StatTile label="Best day" value={String(Math.max(0, ...week.map((d) => d.count)))} />
            </StatStrip>
            {goal > 0 && (
              <div className="mb-4 flex items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-3">
                <Ring pct={todayCount / goal} size={48} stroke={6} tone={done ? "emerald" : "cyan"}>
                  <span className="text-[11px] font-bold tabular-nums text-zinc-200">{todayCount}</span>
                </Ring>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-zinc-100">
                    {done ? "Daily goal complete 🎉" : `${goal - todayCount} to your goal`}
                  </div>
                  <div className="text-xs text-zinc-500">
                    {todayCount} of {goal} pomodoros today
                  </div>
                </div>
                <StatusPill label={done ? "Complete" : "On track"} tone={done ? "emerald" : "cyan"} />
              </div>
            )}
          </>
        );
      })()}

      <CycleDots perLong={settings.perLong} progress={cycleProgress} />

      {breakState ? (
        <BreakTimer breakState={breakState} onComplete={onBreakComplete} onSkip={clearBreak} />
      ) : active ? (
        <ActiveTimer
          session={active}
          sound={settings.sound}
          onWorkComplete={onWorkComplete}
        />
      ) : (
        <StartForm
          pending={pending}
          onStart={(min, label) => {
            requestNotify();
            setLastLabel(label);
            start(() => startSessionAction(min, label));
          }}
        />
      )}

      <button
        type="button"
        onClick={() => setShowSettings((v) => !v)}
        className="mt-3 w-full text-center text-xs font-medium text-zinc-500 hover:text-zinc-300"
      >
        {showSettings ? "Hide settings" : "Cycle settings"}
      </button>
      {showSettings && <SettingsPanel settings={settings} onSave={saveSettings} />}

      <WeekChart week={week} />

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

function CycleDots({ perLong, progress }: { perLong: number; progress: number }) {
  return (
    <div className="mb-4 flex items-center justify-center gap-2">
      {Array.from({ length: perLong }).map((_, i) => (
        <span
          key={i}
          className={`h-2.5 w-2.5 rounded-full transition ${i < progress ? "bg-cyan-400" : "bg-zinc-700"}`}
          title={`${progress} of ${perLong} until a long break`}
        />
      ))}
      <span className="ml-2 text-xs text-zinc-500">
        {perLong - progress} to long break
      </span>
    </div>
  );
}

function TimerShell({
  label,
  state,
  mm,
  ss,
  pct,
  tone,
  children,
}: {
  label: string;
  state: string;
  mm: number;
  ss: number;
  pct: number;
  tone: "work" | "break" | "done";
  children: React.ReactNode;
}) {
  const numberColor = tone === "done" ? "text-emerald-400" : tone === "break" ? "text-amber-300" : "text-zinc-100";
  const barColor = tone === "done" ? "bg-emerald-500" : tone === "break" ? "bg-amber-400" : "bg-cyan-500";
  return (
    <div className="flex flex-col items-center rounded-3xl border border-zinc-800 bg-zinc-900/40 p-8">
      {label && <div className="mb-1 text-sm font-semibold text-cyan-400">{label}</div>}
      <div className="mb-3 text-xs uppercase tracking-wider text-zinc-500">{state}</div>
      <div className={`text-7xl font-bold tabular-nums tracking-tight ${numberColor}`}>
        {String(mm).padStart(2, "0")}:{String(ss).padStart(2, "0")}
      </div>
      <div className="mt-4 h-2 w-full max-w-xs overflow-hidden rounded-full bg-zinc-800">
        <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
      <div className="mt-6 flex gap-3">{children}</div>
    </div>
  );
}

function ActiveTimer({
  session,
  sound,
  onWorkComplete,
}: {
  session: Session;
  sound: boolean;
  onWorkComplete: () => void;
}) {
  const started = new Date(session.started_at).getTime();
  const totalMs = session.duration_minutes * 60 * 1000;
  const endsAt = started + totalMs;

  const [now, setNow] = useState(() => Date.now());
  const [pending, start] = useTransition();
  const firedRef = useRef(false);

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
    if (done && !firedRef.current) {
      firedRef.current = true;
      if (sound) playChime();
      start(() => completeSessionAction(session.id));
      onWorkComplete();
    }
  }, [done, session.id, sound, onWorkComplete, start]);

  function finish() {
    if (firedRef.current) return;
    firedRef.current = true;
    start(() => completeSessionAction(session.id));
    onWorkComplete();
  }
  function cancel() {
    if (!confirm("Cancel this session?")) return;
    start(() => cancelSessionAction(session.id));
  }

  return (
    <TimerShell
      label={session.label || ""}
      state={done ? "Done!" : "Focus"}
      mm={mm}
      ss={ss}
      pct={pct}
      tone={done ? "done" : "work"}
    >
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
    </TimerShell>
  );
}

function BreakTimer({
  breakState,
  onComplete,
  onSkip,
}: {
  breakState: BreakState;
  onComplete: () => void;
  onSkip: () => void;
}) {
  const totalMs = breakState.durationMin * 60 * 1000;
  const [now, setNow] = useState(() => Date.now());
  const firedRef = useRef(false);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const remainingMs = Math.max(0, breakState.endsAt - now);
  const remainingSec = Math.floor(remainingMs / 1000);
  const mm = Math.floor(remainingSec / 60);
  const ss = remainingSec % 60;
  const pct = totalMs > 0 ? Math.min(100, Math.round(((totalMs - remainingMs) / totalMs) * 100)) : 0;
  const done = remainingMs === 0;

  useEffect(() => {
    if (done && !firedRef.current) {
      firedRef.current = true;
      onComplete();
    }
  }, [done, onComplete]);

  return (
    <TimerShell
      label={breakState.kind === "long" ? "Long break" : "Break"}
      state={done ? "Break over" : "Recharge"}
      mm={mm}
      ss={ss}
      pct={pct}
      tone={done ? "done" : "break"}
    >
      <button
        type="button"
        onClick={onSkip}
        className="rounded-xl bg-zinc-800 px-5 py-2.5 text-sm font-semibold text-zinc-300 hover:bg-zinc-700"
      >
        Skip break
      </button>
    </TimerShell>
  );
}

function StartForm({
  pending,
  onStart,
}: {
  pending: boolean;
  onStart: (minutes: number, label: string) => void;
}) {
  const [minutes, setMinutes] = useState(25);
  const [label, setLabel] = useState("");

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
        onClick={() => onStart(minutes, label.trim())}
        disabled={pending}
        className="mt-4 h-12 w-full rounded-xl bg-cyan-500 text-base font-semibold text-zinc-950 hover:bg-cyan-400 disabled:opacity-50"
      >
        {pending ? "Starting…" : `Start ${minutes}-minute timer`}
      </button>
    </div>
  );
}

function SettingsPanel({ settings, onSave }: { settings: Settings; onSave: (s: Settings) => void }) {
  return (
    <div className="mt-2 space-y-3 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
      <NumberRow
        label="Short break (min)"
        value={settings.shortMin}
        onChange={(v) => onSave({ ...settings, shortMin: v })}
      />
      <NumberRow
        label="Long break (min)"
        value={settings.longMin}
        onChange={(v) => onSave({ ...settings, longMin: v })}
      />
      <NumberRow
        label="Pomodoros per long break"
        value={settings.perLong}
        min={2}
        max={8}
        onChange={(v) => onSave({ ...settings, perLong: v })}
      />
      <NumberRow
        label="Daily goal"
        value={settings.dailyGoal}
        min={1}
        max={20}
        onChange={(v) => onSave({ ...settings, dailyGoal: v })}
      />
      <ToggleRow
        label="Auto-start work after break"
        value={settings.autoStart}
        onChange={(v) => onSave({ ...settings, autoStart: v })}
      />
      <ToggleRow
        label="Completion sound"
        value={settings.sound}
        onChange={(v) => onSave({ ...settings, sound: v })}
      />
    </div>
  );
}

function NumberRow({
  label,
  value,
  min = 1,
  max = 60,
  onChange,
}: {
  label: string;
  value: number;
  min?: number;
  max?: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-3 text-sm text-zinc-300">
      <span>{label}</span>
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) => {
          const v = Number(e.target.value);
          if (!Number.isNaN(v)) onChange(Math.max(min, Math.min(max, v)));
        }}
        className="w-16 rounded-lg bg-zinc-900 px-2 py-1.5 text-right text-sm text-zinc-100 outline-none ring-1 ring-zinc-800 focus:ring-cyan-500/50"
      />
    </label>
  );
}

function ToggleRow({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className="flex w-full items-center justify-between gap-3 text-sm text-zinc-300"
    >
      <span>{label}</span>
      <span
        className={`flex h-6 w-11 items-center rounded-full p-0.5 transition ${value ? "bg-cyan-500" : "bg-zinc-700"}`}
      >
        <span className={`h-5 w-5 rounded-full bg-zinc-950 transition ${value ? "translate-x-5" : ""}`} />
      </span>
    </button>
  );
}

function WeekChart({ week }: { week: DayBucket[] }) {
  const max = Math.max(1, ...week.map((d) => d.count));
  return (
    <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
      <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Last 7 days</div>
      <div className="flex h-20 items-end gap-1.5">
        {week.map((d, i) => {
          const h = d.count === 0 ? 4 : Math.max(10, Math.round((d.count / max) * 100));
          return (
            <div key={i} className="flex flex-1 flex-col items-center gap-1">
              <div
                title={`${d.label}: ${d.count} pomodoro${d.count === 1 ? "" : "s"}`}
                className={`w-full rounded-md transition-all ${
                  d.count === 0 ? "bg-zinc-800" : d.isToday ? "bg-cyan-400" : "bg-cyan-500/50"
                }`}
                style={{ height: `${h}%` }}
              />
              <div className={`text-[10px] ${d.isToday ? "text-cyan-300" : "text-zinc-500"}`}>{d.short}</div>
            </div>
          );
        })}
      </div>
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
