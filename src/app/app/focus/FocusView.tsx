"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { saveFocusSessionAction, deleteFocusEntryAction } from "./actions";

const PRESETS = [25, 45, 60, 90];
const STORAGE_KEY = "xp.focus.active";

type Stage = "home" | "setup" | "run" | "reflect";

interface Entry {
  id: number;
  value: number | string;
  label: string | null;
  note: string | null;
  created_at: string;
}

// What a parsed journal entry exposes to the timeline.
interface Journal {
  id: number;
  minutes: number;
  intent: string;
  win: string | null;
  rating: number;
  created_at: string;
}

interface ActiveSession {
  startedAt: number;
  durationMinutes: number;
  intent: string;
  done: string;
}

interface PendingReflect {
  minutes: number;
  intent: string;
  done: string;
}

export function FocusView({ entries }: { entries: Entry[] }) {
  const [stage, setStage] = useState<Stage>("home");
  const [active, setActive] = useState<ActiveSession | null>(null);
  const [pending, setPending] = useState<PendingReflect | null>(null);
  const [hydrated, setHydrated] = useState(false);

  // Resume an in-flight run after a reload (timer is Date-delta based, so it
  // keeps counting correctly across a refresh or a backgrounded tab).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const p = JSON.parse(raw) as Partial<ActiveSession>;
        if (typeof p.startedAt === "number" && typeof p.durationMinutes === "number") {
          // SSR-safe hydration: localStorage is only readable after mount, so the
          // restore must happen in this effect (same pattern as Stopwatch/Pomodoro).
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setActive({
            startedAt: p.startedAt,
            durationMinutes: p.durationMinutes,
            intent: p.intent ?? "",
            done: p.done ?? "",
          });
          setStage("run");
        }
      }
    } catch {
      // ignore malformed storage
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (active && stage === "run") localStorage.setItem(STORAGE_KEY, JSON.stringify(active));
    else localStorage.removeItem(STORAGE_KEY);
  }, [active, stage, hydrated]);

  if (!hydrated) {
    return <div className="h-72 animate-pulse rounded-3xl bg-zinc-900/40" />;
  }

  function startSession(intent: string, durationMinutes: number, done: string) {
    setActive({ startedAt: Date.now(), durationMinutes, intent, done });
    setStage("run");
  }

  function endRun(actualMinutes: number) {
    if (!active) return;
    setPending({ minutes: actualMinutes, intent: active.intent, done: active.done });
    setActive(null);
    setStage("reflect");
  }

  if (stage === "setup") {
    return <Setup onBack={() => setStage("home")} onBegin={startSession} />;
  }

  if (stage === "run" && active) {
    return <Run session={active} onEnd={endRun} />;
  }

  if (stage === "reflect" && pending) {
    return (
      <Reflect
        pending={pending}
        onDone={() => {
          setPending(null);
          setStage("home");
        }}
      />
    );
  }

  return <Home entries={entries} onStart={() => setStage("setup")} />;
}

// ─────────────────────────────── Home (journal) ───────────────────────────────

function Home({ entries, onStart }: { entries: Entry[]; onStart: () => void }) {
  const journal = entries.map(parseEntry);
  const weekMinutes = sumThisWeek(journal);
  const weekCount = countThisWeek(journal);
  const streak = computeStreak(journal);

  return (
    <div className="pb-40">
      <div className="text-[11px] font-medium uppercase tracking-[0.15em] text-zinc-500">
        {todayKicker()}
      </div>
      <h2 className="mt-1 text-3xl font-bold tracking-tight text-zinc-100">Your focus journal</h2>
      <p className="mt-1.5 text-[15px] text-zinc-400">Not minutes logged — meaning made.</p>

      <div className="mt-5 grid grid-cols-3 gap-2.5">
        <MiniStat value={formatHm(weekMinutes)} label="this week" />
        <MiniStat value={`${weekCount}`} label="intentions met" />
        <MiniStat value={streak > 0 ? `${streak}` : "—"} label="day streak" accent />
      </div>

      {journal.length === 0 ? (
        <p className="mt-10 text-center text-sm text-zinc-500">
          No sessions yet. Set an intention and begin your first focus block.
        </p>
      ) : (
        <div className="relative mt-8">
          <div className="absolute left-[7px] top-2 bottom-2 w-0.5 bg-zinc-800" />
          <ul className="flex flex-col gap-4">
            {journal.map((e) => (
              <JournalRow key={e.id} entry={e} />
            ))}
          </ul>
        </div>
      )}

      {/* Sticky CTA — floats just above the fixed bottom nav (z-30). */}
      {/* bottom offset via inline style: a Tailwind arbitrary value can't hold a
          calc() with spaces, and calc needs them around the operator. */}
      <div
        className="fixed inset-x-0 z-20 bg-gradient-to-t from-zinc-950 from-40% to-transparent px-4 pb-3 pt-8"
        style={{ bottom: "calc(64px + env(safe-area-inset-bottom))" }}
      >
        <div className="mx-auto max-w-3xl">
          <button
            type="button"
            onClick={onStart}
            className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-cyan-500 text-base font-semibold text-zinc-950 shadow-lg shadow-cyan-500/25 hover:bg-cyan-400 active:scale-[0.99]"
          >
            <PenIcon className="h-[17px] w-[17px]" />
            Set an intention
          </button>
        </div>
      </div>
    </div>
  );
}

function MiniStat({ value, label, accent }: { value: string; label: string; accent?: boolean }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 px-3 py-3.5 text-center">
      <div className={`text-lg font-extrabold ${accent ? "text-cyan-400" : "text-zinc-100"}`}>
        {value}
      </div>
      <div className="mt-0.5 text-[9.5px] font-medium uppercase tracking-[0.08em] text-zinc-500">
        {label}
      </div>
    </div>
  );
}

function JournalRow({ entry }: { entry: Journal }) {
  const [pending, start] = useTransition();

  function remove() {
    if (!confirm("Delete this session?")) return;
    start(() => deleteFocusEntryAction(entry.id));
  }

  return (
    <li className={`relative pl-[30px] ${pending ? "opacity-40" : ""}`}>
      <span className="absolute left-0 top-1.5 flex h-4 w-4 items-center justify-center rounded-full border-2 border-cyan-500 bg-zinc-950">
        <span className="h-1.5 w-1.5 rounded-full bg-cyan-500" />
      </span>
      <div className="group rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
        <div className="flex items-center justify-between">
          <span className="text-[10.5px] font-medium uppercase tracking-[0.08em] text-zinc-500">
            {relativeStamp(entry.created_at)}
          </span>
          <div className="flex items-center gap-1.5">
            <Rating value={entry.rating} />
            <button
              type="button"
              onClick={remove}
              className="ml-1 rounded-md px-1 text-zinc-700 opacity-0 transition hover:text-red-400 group-hover:opacity-100"
              aria-label="Delete session"
            >
              ×
            </button>
          </div>
        </div>
        <div className="mt-2 text-[15.5px] font-bold text-zinc-100">{entry.intent}</div>
        {entry.win && (
          <p className="mt-1.5 text-[15.5px] italic leading-snug text-zinc-400">
            “{entry.win}”
          </p>
        )}
        <div className="mt-2.5 text-[10.5px] font-medium uppercase tracking-[0.08em] text-zinc-500">
          {entry.minutes} min
        </div>
      </div>
    </li>
  );
}

// ─────────────────────────────── Setup ───────────────────────────────

function Setup({
  onBack,
  onBegin,
}: {
  onBack: () => void;
  onBegin: (intent: string, minutes: number, done: string) => void;
}) {
  const [intent, setIntent] = useState("");
  const [done, setDone] = useState("");
  const [minutes, setMinutes] = useState(45);
  const ready = intent.trim().length > 0;

  return (
    <div className="flex min-h-[70dvh] flex-col">
      <button
        type="button"
        onClick={onBack}
        className="-ml-1 mb-1 flex h-8 w-8 items-center justify-center rounded-full text-zinc-400 hover:bg-zinc-900"
        aria-label="Back to journal"
      >
        <ChevronLeftIcon className="h-[22px] w-[22px]" />
      </button>

      <Kicker accent>Before you begin</Kicker>
      <h2 className="mt-3 text-[30px] font-semibold leading-tight tracking-tight text-zinc-100">
        What&rsquo;s the one thing?
      </h2>

      <input
        autoFocus
        value={intent}
        onChange={(e) => setIntent(e.target.value)}
        autoComplete="off"
        placeholder="e.g. Draft the investor update"
        className="mt-5 w-full border-0 border-b-2 border-zinc-800 bg-transparent px-0 py-2.5 text-[22px] text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-cyan-500"
      />

      <div className="mt-8">
        <Kicker accent>What does &ldquo;done&rdquo; look like?</Kicker>
        <textarea
          value={done}
          onChange={(e) => setDone(e.target.value)}
          rows={3}
          placeholder="Name the finish line so you&rsquo;ll know when you&rsquo;ve reached it."
          className="mt-3 w-full resize-none rounded-2xl border border-zinc-800 bg-zinc-900/40 px-4 py-3.5 text-[15.5px] leading-snug text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30"
        />
      </div>

      <div className="mt-7">
        <Kicker>How long?</Kicker>
        <div className="mt-3 flex gap-2">
          {PRESETS.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMinutes(m)}
              className={`flex-1 rounded-xl py-3 text-[15px] font-bold transition ${
                minutes === m
                  ? "bg-cyan-500 text-zinc-950"
                  : "border border-zinc-800 text-zinc-400 hover:bg-zinc-900"
              }`}
            >
              {m}m
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-5 flex-1" />

      <button
        type="button"
        disabled={!ready}
        onClick={() => ready && onBegin(intent.trim(), minutes, done)}
        className={`mt-6 flex h-14 w-full items-center justify-center gap-2 rounded-2xl text-base font-semibold transition ${
          ready
            ? "bg-cyan-500 text-zinc-950 hover:bg-cyan-400"
            : "cursor-not-allowed bg-zinc-800 text-zinc-600"
        }`}
      >
        Begin <ArrowRightIcon className="h-[18px] w-[18px]" />
      </button>
    </div>
  );
}

// ─────────────────────────────── Run ───────────────────────────────

function Run({
  session,
  onEnd,
}: {
  session: ActiveSession;
  onEnd: (actualMinutes: number) => void;
}) {
  const totalMs = session.durationMinutes * 60 * 1000;
  // Held in state so pausing can shift the clock forward without mutating props.
  const [startedAt, setStartedAt] = useState(session.startedAt);
  const endsAt = startedAt + totalMs;
  const [now, setNow] = useState(() => Date.now());
  const [running, setRunning] = useState(true);
  const [pausedAt, setPausedAt] = useState<number | null>(null);
  const endedRef = useRef(false);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [running]);

  const remainingMs = Math.max(0, endsAt - now);
  const elapsedMs = Math.max(0, Math.min(totalMs, now - startedAt));
  const remainingSec = Math.ceil(remainingMs / 1000);
  const progress = totalMs > 0 ? elapsedMs / totalMs : 0;

  // Auto-advance to reflect at zero.
  useEffect(() => {
    if (remainingMs === 0 && !endedRef.current) {
      endedRef.current = true;
      onEnd(session.durationMinutes);
    }
  }, [remainingMs, onEnd, session.durationMinutes]);

  function togglePause() {
    if (running) {
      setPausedAt(Date.now());
      setRunning(false);
    } else if (pausedAt != null) {
      // Shift the clock forward by however long we were paused.
      const drift = Date.now() - pausedAt;
      setStartedAt((s) => s + drift);
      setPausedAt(null);
      setNow(Date.now());
      setRunning(true);
    }
  }

  function finishNow() {
    if (endedRef.current) return;
    endedRef.current = true;
    const minutes = Math.max(1, Math.round(elapsedMs / 60000));
    onEnd(minutes);
  }

  return (
    <div className="flex min-h-[78dvh] flex-col items-center justify-between py-2 text-center">
      <div className="max-w-[320px]">
        <Kicker accent>Holding one intention</Kicker>
        <div className="mt-3 text-2xl font-semibold leading-snug text-zinc-100">
          {session.intent}
        </div>
        {session.done.trim() && (
          <p className="mt-3 text-[13.5px] leading-snug text-zinc-400">
            Done looks like: {session.done}
          </p>
        )}
      </div>

      <Ring size={250} stroke={13} progress={progress}>
        <div className="text-[56px] font-light tabular-nums tracking-tighter text-zinc-100">
          {fmtClock(remainingSec)}
        </div>
      </Ring>

      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={togglePause}
          className="flex h-16 w-16 items-center justify-center rounded-full bg-cyan-500 text-zinc-950 shadow-lg shadow-cyan-500/20 hover:bg-cyan-400 active:scale-95"
          aria-label={running ? "Pause" : "Resume"}
        >
          {running ? <PauseIcon className="h-6 w-6" /> : <PlayIcon className="h-6 w-6" />}
        </button>
        <button
          type="button"
          onClick={finishNow}
          className="px-4 py-2.5 text-[14.5px] font-semibold text-zinc-400 hover:text-zinc-200"
        >
          I&rsquo;m done
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────── Reflect ───────────────────────────────

function Reflect({
  pending,
  onDone,
}: {
  pending: PendingReflect;
  onDone: () => void;
}) {
  const [win, setWin] = useState("");
  const [rating, setRating] = useState(0);
  const [saving, start] = useTransition();

  function save() {
    start(async () => {
      await saveFocusSessionAction(
        pending.minutes,
        pending.intent,
        win.trim() || "Showed up and put in the time.",
        rating || 3,
        pending.done,
      );
      onDone();
    });
  }

  return (
    <div className="flex min-h-[70dvh] flex-col">
      <Kicker accent>Reflection</Kicker>
      <h2 className="mb-1 mt-3 text-[28px] font-semibold leading-tight tracking-tight text-zinc-100">
        Did you reach it?
      </h2>
      <p className="text-[15px] text-zinc-400">{pending.intent}</p>

      <div className="mt-7">
        <Kicker>One line — what got done</Kicker>
        <textarea
          autoFocus
          value={win}
          onChange={(e) => setWin(e.target.value)}
          rows={3}
          placeholder="The thing you&rsquo;ll be glad you remembered."
          className="mt-3 w-full resize-none rounded-2xl border border-zinc-800 bg-zinc-900/40 px-4 py-3.5 text-[17px] italic leading-snug text-zinc-100 placeholder:not-italic placeholder:text-zinc-600 outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30"
        />
      </div>

      <div className="mt-7">
        <Kicker>How focused were you?</Kicker>
        <div className="mt-3.5 flex gap-3">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setRating(n)}
              className={`flex h-12 flex-1 items-center justify-center rounded-2xl transition ${
                n <= rating ? "bg-cyan-500" : "bg-zinc-900"
              }`}
              aria-label={`${n} of 5`}
            >
              <LeafIcon
                className="h-5 w-5"
                color={n <= rating ? "#09090b" : "#52525b"}
              />
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-5 flex-1" />

      <button
        type="button"
        disabled={saving}
        onClick={save}
        className="mt-6 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-cyan-500 text-base font-semibold text-zinc-950 hover:bg-cyan-400 disabled:opacity-60"
      >
        <CheckIcon className="h-[18px] w-[18px]" /> {saving ? "Saving…" : "Save to journal"}
      </button>
    </div>
  );
}

// ─────────────────────────────── Shared bits ───────────────────────────────

function Kicker({ children, accent }: { children: React.ReactNode; accent?: boolean }) {
  return (
    <div
      className={`text-[11px] font-medium uppercase tracking-[0.15em] ${
        accent ? "text-cyan-400" : "text-zinc-500"
      }`}
    >
      {children}
    </div>
  );
}

function Ring({
  size,
  stroke,
  progress,
  children,
}: {
  size: number;
  stroke: number;
  progress: number;
  children: React.ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          className="stroke-zinc-800"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - Math.min(1, Math.max(0, progress)))}
          className="stroke-cyan-500 transition-[stroke-dashoffset] duration-1000 ease-linear motion-reduce:transition-none"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  );
}

function Rating({ value }: { value: number }) {
  return (
    <span className="flex gap-0.5" aria-label={`Focus ${value} of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <LeafIcon
          key={n}
          className="h-[11px] w-[11px]"
          color={n <= value ? "#06b6d4" : "rgba(63,63,70,0.9)"}
        />
      ))}
    </span>
  );
}

// ─────────────────────────────── Icons ───────────────────────────────

function LeafIcon({ className, color = "currentColor" }: { className?: string; color?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 19c0-8 6-14 14-14 0 8-6 14-14 14zM5 19c4-4 7-6 10-7" />
    </svg>
  );
}

function PenIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 4l6 6L8 22H2v-6L14 4z" />
      <path d="M11 7l6 6" />
    </svg>
  );
}

function ChevronLeftIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 5l-7 7 7 7" />
    </svg>
  );
}

function ArrowRightIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 12.5l5 5 11-11" />
    </svg>
  );
}

function PlayIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M7 5l12 7-12 7V5z" />
    </svg>
  );
}

function PauseIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <rect x="6" y="5" width="4" height="14" rx="1" />
      <rect x="14" y="5" width="4" height="14" rx="1" />
    </svg>
  );
}

// ─────────────────────────────── helpers ───────────────────────────────

function parseEntry(e: Entry): Journal {
  let win: string | null = null;
  let rating = 0;
  if (e.note) {
    try {
      const parsed = JSON.parse(e.note) as { win?: string; rating?: number };
      if (parsed && typeof parsed === "object") {
        win = typeof parsed.win === "string" ? parsed.win : null;
        rating = typeof parsed.rating === "number" ? parsed.rating : 0;
      }
    } catch {
      // legacy note (distraction list) — no reflection/rating to show
    }
  }
  return {
    id: e.id,
    minutes: Number(e.value) || 0,
    intent: e.label || "Deep work",
    win,
    rating,
    created_at: e.created_at,
  };
}

function fmtClock(totalSec: number): string {
  const s = Math.max(0, totalSec);
  const m = Math.floor(s / 60);
  const ss = s % 60;
  return `${String(m).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
}

function formatHm(m: number): string {
  const h = Math.floor(m / 60);
  const rem = m % 60;
  if (h === 0) return `${rem}m`;
  return `${h}h ${rem}m`;
}

function todayKicker(): string {
  return new Date()
    .toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })
    .toUpperCase();
}

function localDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// Newest-first journal stamp: "Today · 9:13 AM" / "Yesterday · 4:02 PM" / "Jun 4 · 8:30 AM".
function relativeStamp(iso: string): string {
  const d = new Date(iso);
  const time = d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  const key = localDateKey(d);
  const today = localDateKey(new Date());
  const y = new Date();
  y.setDate(y.getDate() - 1);
  const yesterday = localDateKey(y);
  let day: string;
  if (key === today) day = "Today";
  else if (key === yesterday) day = "Yesterday";
  else day = d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  return `${day} · ${time}`;
}

// Start of the current week (Monday) in local time.
function startOfWeek(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  const dow = (d.getDay() + 6) % 7; // Mon = 0
  d.setDate(d.getDate() - dow);
  return d;
}

function sumThisWeek(journal: Journal[]): number {
  const from = startOfWeek().getTime();
  return journal.reduce(
    (s, e) => (new Date(e.created_at).getTime() >= from ? s + e.minutes : s),
    0,
  );
}

function countThisWeek(journal: Journal[]): number {
  const from = startOfWeek().getTime();
  return journal.reduce(
    (n, e) => (new Date(e.created_at).getTime() >= from ? n + 1 : n),
    0,
  );
}

function computeStreak(journal: Journal[]): number {
  if (journal.length === 0) return 0;
  const days = new Set(journal.map((e) => localDateKey(new Date(e.created_at))));
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
