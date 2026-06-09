"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  saveFocusSessionAction,
  updateFocusSessionAction,
  deleteFocusEntryAction,
  type FocusNote,
} from "./actions";

// ── tags + theme ──────────────────────────────────────────────────────────
// Adapted to the suite's dark/zinc surfaces: a calm teal accent + a per-tag
// OKLCH hue carried through pills, the timeline node, ratio bars, and the
// timer ring (the playful, colorful part of the "Warm Journal" direction).
const TEAL = "#2bb0c4";
const GOLD = "#d4a72a";
const CORAL = "#e2785c";

interface TagMeta {
  label: string;
  hue: number;
  emoji: string;
}
const TAGS: Record<string, TagMeta> = {
  Deep: { label: "Deep work", hue: 210, emoji: "⚡" },
  Learn: { label: "Learn", hue: 150, emoji: "📚" },
  Create: { label: "Create", hue: 35, emoji: "🎨" },
  Admin: { label: "Admin", hue: 280, emoji: "🧰" },
  Write: { label: "Writing", hue: 95, emoji: "✍️" },
};
const TAG_KEYS = Object.keys(TAGS);
const tagOf = (t: string | undefined): TagMeta => TAGS[t ?? "Deep"] ?? TAGS.Deep;
const tagText = (hue: number) => `oklch(0.82 0.12 ${hue})`;
const tagBg = (hue: number) => `oklch(0.7 0.13 ${hue} / 0.15)`;
const tagAccent = (hue: number) => `oklch(0.68 0.14 ${hue})`;

const WD = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const MO = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
const WEEK_GOAL = 300; // minutes/week
const FOCUS_WORDS = ["", "Scattered", "Distracted", "Okay", "Locked in", "Flow"];

type Met = boolean | "partly";

interface Entry {
  id: number;
  intention: string;
  tag: string;
  planned: number;
  actual: number;
  started: Date;
  win: string;
  rating: number;
  met: Met;
}

interface RawRow {
  id: number;
  value: number | string | null;
  label: string | null;
  note: string | null;
  created_at: string;
}

function parseEntry(r: RawRow): Entry {
  const actual = Math.round(Number(r.value) || 0);
  let win = "";
  let rating = 3;
  let tag = "Deep";
  let planned = actual || 25;
  let met: Met = true;
  if (r.note) {
    try {
      const p = JSON.parse(r.note) as FocusNote;
      if (p && typeof p === "object") {
        win = typeof p.win === "string" ? p.win : "";
        rating = typeof p.rating === "number" ? p.rating : 3;
        if (typeof p.tag === "string" && TAGS[p.tag]) tag = p.tag;
        if (typeof p.planned === "number" && p.planned > 0) planned = p.planned;
        if (p.met === false || p.met === "partly" || p.met === true) met = p.met;
      }
    } catch {
      win = r.note; // legacy plain note
    }
  }
  return {
    id: r.id,
    intention: r.label || "Focus session",
    tag,
    planned,
    actual,
    started: new Date(r.created_at),
    win,
    rating,
    met,
  };
}

// ── date + stats helpers ────────────────────────────────────────────────────
function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function startOfWeek(d: Date): Date {
  const x = new Date(d);
  const dow = (x.getDay() + 6) % 7; // Mon = 0
  x.setDate(x.getDate() - dow);
  x.setHours(0, 0, 0, 0);
  return x;
}
function fmtMins(m: number): string {
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h}h ${r}m` : `${h}h`;
}
function fmtClock(secs: number): string {
  const s = Math.max(0, Math.floor(secs));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}
function fmtTime(d: Date): string {
  let h = d.getHours();
  const m = d.getMinutes();
  const ap = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${String(m).padStart(2, "0")} ${ap}`;
}

interface Stats {
  weekMinutes: number;
  met: number;
  streak: number;
  avgFocus: number;
  perDay: { date: Date; mins: number; isToday: boolean; future: boolean }[];
}
function computeStats(list: Entry[], now: Date): Stats {
  const sow = startOfWeek(now);
  const eow = new Date(sow);
  eow.setDate(eow.getDate() + 7);
  const week = list.filter((s) => s.started >= sow && s.started < eow);
  const weekMinutes = week.reduce((a, s) => a + s.actual, 0);
  const met = week.filter((s) => s.met === true).length;

  const days = new Set(list.map((s) => `${s.started.getFullYear()}-${s.started.getMonth()}-${s.started.getDate()}`));
  let streak = 0;
  const cur = new Date(now);
  cur.setHours(0, 0, 0, 0);
  while (days.has(`${cur.getFullYear()}-${cur.getMonth()}-${cur.getDate()}`)) {
    streak++;
    cur.setDate(cur.getDate() - 1);
  }

  const rated = list.filter((s) => s.rating);
  const avgFocus = rated.length ? rated.reduce((a, s) => a + s.rating, 0) / rated.length : 0;

  const perDay = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(sow);
    d.setDate(d.getDate() + i);
    const mins = list.filter((s) => sameDay(s.started, d)).reduce((a, s) => a + s.actual, 0);
    return { date: d, mins, isToday: sameDay(d, now), future: d > now };
  });

  return { weekMinutes, met, streak, avgFocus, perDay };
}

interface Pending {
  intention: string;
  tag: string;
  planned: number;
}
type SheetKind = null | "intention" | "reflect" | "detail";

export function FocusView({ entries: rows }: { entries: RawRow[] }) {
  const now = useMemo(() => new Date(), []);
  const entries = useMemo(() => rows.map(parseEntry), [rows]);
  const stats = useMemo(() => computeStats(entries, now), [entries, now]);

  const [screen, setScreen] = useState<"home" | "timer">("home");
  const [sheet, setSheet] = useState<SheetKind>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [reflect, setReflect] = useState<{ entry: Entry; mode: "new" | "edit" } | null>(null);
  const [detail, setDetail] = useState<Entry | null>(null);
  const [toast, setToast] = useState("");
  const [, start] = useTransition();

  function flash(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(""), 2600);
  }

  function beginTimer(p: Pending) {
    setPending(p);
    setSheet(null);
    setScreen("timer");
  }

  function endTimer(actualMin: number) {
    if (!pending) return;
    setScreen("home");
    setReflect({
      entry: {
        id: -1,
        intention: pending.intention,
        tag: pending.tag,
        planned: pending.planned,
        actual: Math.max(1, actualMin),
        started: new Date(),
        win: "",
        rating: 4,
        met: true,
      },
      mode: "new",
    });
    setPending(null);
    setSheet("reflect");
  }

  function saveReflect(e: Entry) {
    const input = {
      minutes: e.actual,
      intent: e.intention,
      tag: e.tag,
      planned: e.planned,
      win: e.win,
      rating: e.rating,
      met: e.met,
    };
    if (reflect?.mode === "edit") start(() => updateFocusSessionAction(e.id, input));
    else start(() => saveFocusSessionAction(input));
    setSheet(null);
    setReflect(null);
    flash(e.met === true ? "Logged — intention met! ✦" : "Logged to your journal.");
  }

  function removeEntry(id: number) {
    start(() => deleteFocusEntryAction(id));
    setSheet(null);
    setReflect(null);
    setDetail(null);
    flash("Session removed.");
  }

  if (screen === "timer" && pending) {
    return <TimerScreen pending={pending} onEnd={endTimer} onCancel={() => { setPending(null); setScreen("home"); }} />;
  }

  return (
    <div className="-mt-1 pb-28">
      <Keyframes />
      <Home
        entries={entries}
        stats={stats}
        now={now}
        onOpen={(e) => {
          setDetail(e);
          setSheet("detail");
        }}
      />

      {/* CTA */}
      <div
        className="fixed inset-x-0 z-20 bg-gradient-to-t from-zinc-950 from-40% to-transparent px-4 pb-3 pt-8"
        style={{ bottom: "calc(64px + env(safe-area-inset-bottom))" }}
      >
        <div className="mx-auto max-w-3xl">
          <button
            type="button"
            onClick={() => setSheet("intention")}
            className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl text-base font-semibold text-zinc-950 shadow-lg active:scale-[0.99]"
            style={{ background: TEAL, boxShadow: `0 8px 22px ${TEAL}40` }}
          >
            ✎ Set an intention
          </button>
        </div>
      </div>

      {toast && (
        <div
          className="fixed inset-x-0 z-40 mx-auto flex justify-center px-4"
          style={{ bottom: "calc(64px + env(safe-area-inset-bottom) + 5rem)" }}
        >
          <div className="rounded-full bg-zinc-100 px-4 py-2.5 text-sm font-semibold text-zinc-900 shadow-lg [animation:foc-toast_.3s_ease]">
            {toast}
          </div>
        </div>
      )}

      {sheet === "intention" && <IntentionSheet onClose={() => setSheet(null)} onStart={beginTimer} />}
      {sheet === "reflect" && reflect && (
        <ReflectSheet
          base={reflect.entry}
          mode={reflect.mode}
          onClose={() => {
            setSheet(null);
            setReflect(null);
          }}
          onSave={saveReflect}
          onDelete={removeEntry}
        />
      )}
      {sheet === "detail" && detail && (
        <DetailSheet
          entry={detail}
          onClose={() => setSheet(null)}
          onEdit={(e) => {
            setReflect({ entry: e, mode: "edit" });
            setSheet("reflect");
          }}
        />
      )}
    </div>
  );
}

// ───────────────────────────── Home ─────────────────────────────

const SCOPES: { v: string; label: string }[] = [
  { v: "all", label: "All" },
  { v: "true", label: "Met" },
  { v: "partly", label: "Partly" },
  { v: "false", label: "Missed" },
];

function Home({
  entries,
  stats,
  now,
  onOpen,
}: {
  entries: Entry[];
  stats: Stats;
  now: Date;
  onOpen: (e: Entry) => void;
}) {
  const [scope, setScope] = useState("all");
  const [tag, setTag] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [searching, setSearching] = useState(false);

  const filtered = useMemo(
    () =>
      entries.filter((s) => {
        if (scope !== "all" && String(s.met) !== scope) return false;
        if (tag && s.tag !== tag) return false;
        if (q.trim()) {
          const t = q.toLowerCase();
          if (!s.intention.toLowerCase().includes(t) && !s.win.toLowerCase().includes(t)) return false;
        }
        return true;
      }),
    [entries, scope, tag, q],
  );

  const groups = useMemo(() => {
    const g: { date: Date; items: Entry[] }[] = [];
    for (const s of filtered) {
      const last = g[g.length - 1];
      if (last && sameDay(last.date, s.started)) last.items.push(s);
      else g.push({ date: s.started, items: [s] });
    }
    return g;
  }, [filtered]);

  const goalPct = Math.min(1, stats.weekMinutes / WEEK_GOAL);
  const hasFilter = scope !== "all" || tag !== null || q.trim() !== "";

  return (
    <div>
      <p className="text-[14.5px] text-zinc-400">Set an intention, run a focus session, journal what got done.</p>
      <p className="mt-3 text-[11.5px] font-bold uppercase tracking-[0.14em]" style={{ color: TEAL }}>
        {WD[now.getDay()]}DAY, {MO[now.getMonth()]} {now.getDate()}
      </p>
      <h1 className="mt-1 text-[28px] font-bold tracking-tight text-zinc-100">Your focus journal</h1>
      <p className="mt-1 text-[15px] text-zinc-500">Not minutes logged — meaning made.</p>

      {/* Hero — this week */}
      <div className="mt-4 rounded-3xl border border-zinc-800 bg-zinc-900/40 p-[18px]">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">This week</span>
          <span className="text-xs font-semibold tabular-nums" style={{ color: TEAL }}>
            {Math.round(goalPct * 100)}% of {fmtMins(WEEK_GOAL)} goal
          </span>
        </div>
        <div className="mt-2 flex items-center justify-between">
          <div className="text-[44px] font-bold leading-none tracking-tight text-zinc-100">
            {fmtMins(stats.weekMinutes)}
          </div>
          <Ring size={58} stroke={6} progress={goalPct} color={TEAL} glow>
            <span className="text-[13px] font-bold tabular-nums text-zinc-200">{Math.round(goalPct * 100)}%</span>
          </Ring>
        </div>
        <div className="mt-3">
          <Bar value={goalPct} height={7} color={TEAL} />
        </div>
        <WeekBars perDay={stats.perDay} />
      </div>

      {/* Stat grid */}
      <div className="mt-2.5 grid grid-cols-3 gap-2.5">
        <StatCard value={String(stats.met)} label="Intentions met" />
        <StatCard value={`${stats.streak}`} label="Day streak" flame tone={CORAL} />
        <StatCard value={stats.avgFocus.toFixed(1)} label="Avg focus" />
      </div>

      {/* Filter bar */}
      <div className="mt-4 flex min-h-10 items-center gap-2">
        {searching ? (
          <div className="flex flex-1 items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2">
            <span className="text-zinc-500">⌕</span>
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search intentions & notes"
              className="min-w-0 flex-1 bg-transparent text-sm text-zinc-100 placeholder:text-zinc-500 outline-none"
            />
            <button
              type="button"
              aria-label="Close search"
              onClick={() => {
                setSearching(false);
                setQ("");
              }}
              className="text-zinc-500 hover:text-zinc-300"
            >
              ✕
            </button>
          </div>
        ) : (
          <>
            <button
              type="button"
              aria-label="Search"
              onClick={() => setSearching(true)}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-zinc-800 text-zinc-400 hover:text-zinc-200"
            >
              ⌕
            </button>
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {SCOPES.map((s) => (
                <FilterChip key={s.v} active={scope === s.v} onClick={() => setScope(s.v)}>
                  {s.label}
                </FilterChip>
              ))}
              <span className="mx-0.5 w-px shrink-0 self-stretch bg-zinc-800" />
              {TAG_KEYS.map((k) => (
                <FilterChip key={k} active={tag === k} onClick={() => setTag(tag === k ? null : k)}>
                  {TAGS[k].emoji} {TAGS[k].label}
                </FilterChip>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Timeline */}
      {groups.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-8 text-center">
          <div className="text-3xl text-zinc-600">⌕</div>
          <p className="mt-2 text-sm text-zinc-300">{hasFilter ? "No sessions match" : "No sessions yet"}</p>
          <p className="mt-0.5 text-xs text-zinc-500">
            {hasFilter ? "Try clearing filters." : "Set an intention to start your first focus block."}
          </p>
          {hasFilter && (
            <button
              type="button"
              onClick={() => {
                setScope("all");
                setTag(null);
                setQ("");
                setSearching(false);
              }}
              className="mt-3 text-xs font-semibold"
              style={{ color: TEAL }}
            >
              Reset filters
            </button>
          )}
        </div>
      ) : (
        groups.map((g, gi) => (
          <div key={gi} className="mt-5">
            <div className="mb-2 flex items-baseline justify-between px-0.5">
              <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-zinc-400">{dayLabel(g.date, now)}</span>
              <span className="text-xs tabular-nums text-zinc-500">{fmtMins(g.items.reduce((a, s) => a + s.actual, 0))}</span>
            </div>
            <div className="flex flex-col gap-3">
              {g.items.map((s, i) => (
                <EntryCard key={s.id} entry={s} onOpen={onOpen} isLast={i === g.items.length - 1} />
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function dayLabel(d: Date, now: Date): string {
  if (sameDay(d, now)) return "Today";
  const y = new Date(now);
  y.setDate(y.getDate() - 1);
  if (sameDay(d, y)) return "Yesterday";
  return `${WD[d.getDay()]} · ${MO[d.getMonth()]} ${d.getDate()}`;
}

function WeekBars({ perDay }: { perDay: Stats["perDay"] }) {
  const max = Math.max(WEEK_GOAL / 5, ...perDay.map((d) => d.mins), 1);
  return (
    <div className="mt-3 flex h-[62px] items-end gap-1.5">
      {perDay.map((d, i) => {
        const h = Math.max(d.mins ? 8 : 3, (d.mins / max) * 46);
        return (
          <div key={i} className="flex flex-1 flex-col items-center justify-end gap-1.5">
            <div
              className={`w-full max-w-[22px] rounded-md ${d.future ? "border border-dashed border-zinc-700" : ""}`}
              style={{
                height: h,
                background: d.future ? "transparent" : d.isToday ? TEAL : `${TEAL}55`,
              }}
            />
            <span className="text-[10px]" style={{ color: d.isToday ? TEAL : "#71717a" }}>
              {WD[d.date.getDay()][0]}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function StatCard({ value, label, flame, tone }: { value: string; label: string; flame?: boolean; tone?: string }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 px-3 py-3 text-center">
      <div className="text-[25px] font-bold leading-none" style={{ color: tone ?? "#fafafa" }}>
        {value}
        {flame && <span className="ml-0.5 text-base">🔥</span>}
      </div>
      <div className="mt-1 text-[10px] font-medium uppercase tracking-wider text-zinc-500">{label}</div>
    </div>
  );
}

function EntryCard({ entry, onOpen, isLast }: { entry: Entry; onOpen: (e: Entry) => void; isLast: boolean }) {
  const tag = tagOf(entry.tag);
  const ratio = Math.min(1, entry.actual / Math.max(1, entry.planned));
  return (
    <div className="flex gap-3">
      <div className="flex w-[22px] shrink-0 flex-col items-center">
        <span className="text-lg leading-none" style={{ color: tagAccent(tag.hue) }} aria-hidden>
          ◎
        </span>
        {!isLast && <span className="mt-1 w-0.5 flex-1 rounded bg-zinc-800" />}
      </div>
      <button
        type="button"
        onClick={() => onOpen(entry)}
        className="mb-1 flex-1 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-3.5 text-left transition active:scale-[0.99]"
      >
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11.5px] tabular-nums text-zinc-500">{fmtTime(entry.started)}</span>
          <TagPill tag={entry.tag} />
        </div>
        <div className="mt-1 text-[16.5px] font-semibold leading-snug text-zinc-100">{entry.intention}</div>
        {entry.win && <div className="mt-1 line-clamp-2 text-[13px] text-zinc-400">{entry.win}</div>}
        <div className="mt-2.5 flex items-center gap-2.5">
          <span className="shrink-0 text-[12px] tabular-nums text-zinc-400">
            ⏲ {fmtMins(entry.actual)}
            <span className="text-zinc-600"> / {entry.planned}m</span>
          </span>
          <div className="min-w-0 flex-1">
            <Bar value={ratio} height={5} color={tagAccent(tag.hue)} />
          </div>
          <MetBadge met={entry.met} mini />
        </div>
      </button>
    </div>
  );
}

// ───────────────────────────── Intention sheet ─────────────────────────────

const PRESETS = [15, 25, 45, 50];

function IntentionSheet({ onClose, onStart }: { onClose: () => void; onStart: (p: Pending) => void }) {
  const [text, setText] = useState("");
  const [tag, setTag] = useState("Deep");
  const [mins, setMins] = useState(25);
  const ready = text.trim().length > 0;

  return (
    <Sheet onClose={onClose} title="Set an intention" sub="One clear thing. Name it before you start.">
      <Label>I will focus on…</Label>
      <textarea
        autoFocus
        value={text}
        maxLength={120}
        onChange={(e) => setText(e.target.value)}
        rows={2}
        placeholder="e.g. Draft the launch email and get it to 90%"
        className="w-full resize-none rounded-xl border border-zinc-800 bg-zinc-900 px-3.5 py-3 text-base text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-zinc-600"
      />

      <Label>Type of work</Label>
      <div className="flex flex-wrap gap-2">
        {TAG_KEYS.map((k) => (
          <TagSelectChip key={k} tagKey={k} active={tag === k} onClick={() => setTag(k)} />
        ))}
      </div>

      <Label>How long?</Label>
      <div className="flex gap-2">
        {PRESETS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setMins(p)}
            className="flex flex-1 flex-col items-center rounded-xl border py-2.5 transition"
            style={
              mins === p
                ? { borderColor: TEAL, background: `${TEAL}22`, color: "#e4e4e7" }
                : { borderColor: "#27272a", color: "#a1a1aa" }
            }
          >
            <span className="text-lg font-bold">{p}</span>
            <span className="text-[10px] uppercase tracking-wide">min</span>
          </button>
        ))}
      </div>
      <Stepper value={mins} onChange={(v) => setMins(Math.max(5, Math.min(180, v)))} step={5} />

      <button
        type="button"
        disabled={!ready}
        onClick={() => ready && onStart({ intention: text.trim(), tag, planned: mins })}
        className="mt-5 h-14 w-full rounded-2xl text-base font-semibold text-zinc-950 transition disabled:opacity-40"
        style={{ background: TEAL }}
      >
        ▶ Start focus
      </button>
    </Sheet>
  );
}

// ───────────────────────────── Timer (full screen) ─────────────────────────────

function TimerScreen({ pending, onEnd, onCancel }: { pending: Pending; onEnd: (actualMin: number) => void; onCancel: () => void }) {
  const [bonus, setBonus] = useState(0);
  const total = (pending.planned + bonus) * 60;
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(true);
  const last = useRef<number | null>(null);
  const done = elapsed >= total;
  const tag = tagOf(pending.tag);
  const accent = tagAccent(tag.hue);

  // Real-time countdown (1×), robust to backgrounding via wall-clock delta.
  useEffect(() => {
    if (!running || done) {
      last.current = null;
      return;
    }
    const id = window.setInterval(() => {
      const now = Date.now();
      const dt = last.current ? (now - last.current) / 1000 : 0;
      last.current = now;
      setElapsed((e) => Math.min(total, e + dt));
    }, 250);
    return () => window.clearInterval(id);
  }, [running, done, total]);

  const remaining = Math.max(0, total - elapsed);
  const progress = total ? elapsed / total : 0;
  const actualMin = Math.max(1, Math.round(elapsed / 60));

  return (
    <div
      className="fixed inset-0 z-40 flex flex-col items-center [animation:foc-fade_.3s_ease]"
      style={{ background: `radial-gradient(120% 80% at 50% 0%, ${tagBg(tag.hue)}, #09090b)` }}
    >
      <button type="button" onClick={onCancel} aria-label="Cancel session" className="absolute right-4 top-14 p-2 text-zinc-400">
        ✕
      </button>

      <div className="mt-16 flex flex-col items-center gap-3 px-8 text-center">
        <TagPill tag={pending.tag} />
        <p className="text-[19px] font-semibold leading-snug text-zinc-100">{pending.intention}</p>
      </div>

      <div className={`mt-8 ${running && !done ? "[animation:foc-breathe_5s_ease-in-out_infinite] motion-reduce:animate-none" : ""}`}>
        <Ring size={250} stroke={12} progress={done ? 1 : progress} color={accent} glow>
          <div className="flex flex-col items-center text-center">
            {done ? (
              <>
                <span className="text-5xl" style={{ color: accent }}>✓</span>
                <span className="mt-1 text-sm text-zinc-400">Time&rsquo;s up</span>
              </>
            ) : (
              <>
                <span className="text-[54px] font-bold tabular-nums leading-none text-zinc-100">{fmtClock(remaining)}</span>
                <span className="mt-1 text-xs text-zinc-500">{running ? "remaining" : "paused"}</span>
              </>
            )}
          </div>
        </Ring>
      </div>

      <div className="mt-6 flex items-center gap-2 text-[13px] text-zinc-400">
        <span>
          <b className="text-zinc-200">{fmtMins(actualMin)}</b> focused
        </span>
        <span className="h-1 w-1 rounded-full bg-zinc-700" />
        <span>
          <b className="text-zinc-200">{pending.planned + bonus}m</b> planned
        </span>
      </div>

      <div className="mt-auto w-full px-8 pb-12">
        {done ? (
          <button
            type="button"
            onClick={() => onEnd(Math.round(total / 60))}
            className="h-14 w-full rounded-2xl text-base font-semibold text-zinc-950"
            style={{ background: TEAL }}
          >
            ✓ Reflect on it
          </button>
        ) : (
          <>
            <div className="flex items-center justify-center gap-7">
              <button
                type="button"
                onClick={() => setBonus((b) => b + 5)}
                aria-label="Add 5 minutes"
                className="flex h-12 w-12 items-center justify-center rounded-full border border-zinc-700 text-xs font-bold text-zinc-300"
              >
                +5
              </button>
              <button
                type="button"
                onClick={() => setRunning((r) => !r)}
                aria-label={running ? "Pause" : "Resume"}
                className="flex h-[84px] w-[84px] items-center justify-center rounded-full text-3xl text-zinc-950"
                style={{ background: TEAL, boxShadow: `0 10px 26px ${TEAL}55` }}
              >
                {running ? "❚❚" : "▶"}
              </button>
              <button
                type="button"
                onClick={onCancel}
                aria-label="Cancel"
                className="flex h-12 w-12 items-center justify-center rounded-full border border-zinc-700 text-zinc-400"
              >
                ✕
              </button>
            </div>
            <button
              type="button"
              onClick={() => onEnd(actualMin)}
              className="mt-5 w-full text-center text-sm font-semibold"
              style={{ color: CORAL }}
            >
              End session
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ───────────────────────────── Reflect sheet ─────────────────────────────

const MET_OPTS: { v: string; label: string }[] = [
  { v: "true", label: "Met it" },
  { v: "partly", label: "Partly" },
  { v: "false", label: "Missed" },
];

function ReflectSheet({
  base,
  mode,
  onClose,
  onSave,
  onDelete,
}: {
  base: Entry;
  mode: "new" | "edit";
  onClose: () => void;
  onSave: (e: Entry) => void;
  onDelete: (id: number) => void;
}) {
  const [met, setMet] = useState(String(base.met));
  const [note, setNote] = useState(base.win === "Showed up and put in the time." ? "" : base.win);
  const [rating, setRating] = useState(base.rating || 4);
  const [actual, setActual] = useState(base.actual);
  const tag = tagOf(base.tag);

  function save() {
    const metVal: Met = met === "true" ? true : met === "false" ? false : "partly";
    onSave({ ...base, met: metVal, win: note.trim(), rating, actual });
  }

  return (
    <Sheet onClose={onClose}>
      <div className="mb-1">
        <TagPill tag={base.tag} />
      </div>
      <h2 className="text-[22px] font-bold text-zinc-100">{mode === "edit" ? "Edit session" : "How did it go?"}</h2>
      <p className="mt-0.5 text-[15px] text-zinc-400">{base.intention}</p>

      <Label>Time focused</Label>
      <Stepper value={actual} onChange={(v) => setActual(Math.max(1, v))} step={5} />

      <Label>Did you meet your intention?</Label>
      <Segmented options={MET_OPTS} value={met} onChange={setMet} accent={tagAccent(tag.hue)} />

      <Label>What got done?</Label>
      <textarea
        value={note}
        maxLength={280}
        rows={3}
        onChange={(e) => setNote(e.target.value)}
        placeholder="A line for future-you: what moved, what's left."
        className="w-full resize-none rounded-xl border border-zinc-800 bg-zinc-900 px-3.5 py-3 text-base text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-zinc-600"
      />

      <Label>How focused were you?</Label>
      <div className="flex items-center gap-3">
        <FocusDots value={rating} onChange={setRating} />
        <span className="text-sm text-zinc-400">{FOCUS_WORDS[rating]}</span>
      </div>

      <button
        type="button"
        onClick={save}
        className="mt-5 h-14 w-full rounded-2xl text-base font-semibold text-zinc-950"
        style={{ background: TEAL }}
      >
        ✓ {mode === "edit" ? "Save changes" : "Save to journal"}
      </button>
      {mode === "edit" ? (
        <button type="button" onClick={() => onDelete(base.id)} className="mt-1 h-11 w-full text-sm font-semibold" style={{ color: CORAL }}>
          Delete session
        </button>
      ) : (
        <button type="button" onClick={onClose} className="mt-1 h-11 w-full text-sm font-semibold text-zinc-500 hover:text-zinc-300">
          Discard
        </button>
      )}
    </Sheet>
  );
}

// ───────────────────────────── Detail sheet ─────────────────────────────

function DetailSheet({ entry, onClose, onEdit }: { entry: Entry; onClose: () => void; onEdit: (e: Entry) => void }) {
  const tag = tagOf(entry.tag);
  const ratio = Math.min(1, entry.actual / Math.max(1, entry.planned));
  return (
    <Sheet onClose={onClose}>
      <div className="mb-2 flex items-center justify-between">
        <TagPill tag={entry.tag} />
        <MetBadge met={entry.met} />
      </div>
      <h2 className="text-[22px] font-bold text-zinc-100">{entry.intention}</h2>
      <p className="mt-1 text-xs uppercase tracking-wider text-zinc-500">
        {WD[entry.started.getDay()]} · {MO[entry.started.getMonth()]} {entry.started.getDate()} · {fmtTime(entry.started)}
      </p>

      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <DetailStat n={fmtMins(entry.actual)} l="focused" />
        <DetailStat n={`${entry.planned}m`} l="planned" />
        <DetailStat n={`${Math.round(ratio * 100)}%`} l="of plan" />
      </div>
      <div className="mt-3">
        <Bar value={ratio} height={7} color={tagAccent(tag.hue)} />
      </div>

      <Label>Focus</Label>
      <FocusDots value={entry.rating} />

      {entry.win && (
        <>
          <Label>Notes</Label>
          <p className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-3 text-sm text-zinc-300">{entry.win}</p>
        </>
      )}

      <button
        type="button"
        onClick={() => onEdit(entry)}
        className="mt-5 h-12 w-full rounded-2xl text-sm font-semibold"
        style={{ background: `${TEAL}22`, color: TEAL }}
      >
        ✎ Edit session
      </button>
    </Sheet>
  );
}

function DetailStat({ n, l }: { n: string; l: string }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 py-3">
      <div className="text-lg font-bold text-zinc-100">{n}</div>
      <div className="mt-0.5 text-[10px] uppercase tracking-wider text-zinc-500">{l}</div>
    </div>
  );
}

// ───────────────────────────── shared primitives ─────────────────────────────

function Label({ children }: { children: React.ReactNode }) {
  return <div className="mb-2 mt-5 text-xs font-bold uppercase tracking-wider text-zinc-500">{children}</div>;
}

function TagPill({ tag }: { tag: string }) {
  const t = tagOf(tag);
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11.5px] font-semibold"
      style={{ color: tagText(t.hue), background: tagBg(t.hue) }}
    >
      <span aria-hidden>{t.emoji}</span>
      {t.label}
    </span>
  );
}

function TagSelectChip({ tagKey, active, onClick }: { tagKey: string; active: boolean; onClick: () => void }) {
  const t = TAGS[tagKey];
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] font-semibold transition"
      style={
        active
          ? { color: tagText(t.hue), background: tagBg(t.hue), borderColor: tagAccent(t.hue) }
          : { color: "#a1a1aa", borderColor: "#27272a" }
      }
    >
      <span aria-hidden>{t.emoji}</span>
      {t.label}
    </button>
  );
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-[13px] font-semibold transition ${
        active ? "bg-zinc-100 text-zinc-900" : "border border-zinc-800 text-zinc-400 hover:text-zinc-200"
      }`}
    >
      {children}
    </button>
  );
}

function MetBadge({ met, mini }: { met: Met; mini?: boolean }) {
  const cfg =
    met === true
      ? { label: "Met", glyph: "✓", color: TEAL }
      : met === "partly"
        ? { label: "Partly", glyph: "◑", color: GOLD }
        : { label: "Missed", glyph: "✕", color: CORAL };
  if (mini) {
    return (
      <span
        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold"
        style={{ color: cfg.color, background: `${cfg.color}22` }}
        title={cfg.label}
      >
        {cfg.glyph}
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11.5px] font-bold"
      style={{ color: cfg.color, background: `${cfg.color}22` }}
    >
      {cfg.glyph} {cfg.label}
    </span>
  );
}

function FocusDots({ value, onChange }: { value: number; onChange?: (v: number) => void }) {
  return (
    <div className="flex gap-2">
      {[1, 2, 3, 4, 5].map((n) => {
        const on = n <= value;
        const dot = (
          <span
            className="block h-3.5 w-3.5 rounded-full"
            style={{ background: on ? TEAL : "#3f3f46" }}
          />
        );
        return onChange ? (
          <button key={n} type="button" onClick={() => onChange(n)} aria-label={`${n} of 5`} className="p-0.5">
            {dot}
          </button>
        ) : (
          <span key={n} className="p-0.5">
            {dot}
          </span>
        );
      })}
    </div>
  );
}

function Segmented({
  options,
  value,
  onChange,
  accent,
}: {
  options: { v: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
  accent: string;
}) {
  return (
    <div className="flex gap-1 rounded-full bg-zinc-900 p-1">
      {options.map((o) => {
        const on = value === o.v;
        return (
          <button
            key={o.v}
            type="button"
            onClick={() => onChange(o.v)}
            className="flex-1 rounded-full py-2 text-[13px] font-semibold transition"
            style={on ? { background: accent, color: "#09090b" } : { color: "#a1a1aa" }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function Stepper({ value, onChange, step }: { value: number; onChange: (v: number) => void; step: number }) {
  return (
    <div className="mt-2 flex items-center gap-3">
      <button
        type="button"
        onClick={() => onChange(value - step)}
        aria-label="Less"
        className="flex h-10 w-10 items-center justify-center rounded-full border border-zinc-700 text-xl text-zinc-200 hover:bg-zinc-800"
      >
        −
      </button>
      <div className="flex-1 text-center text-2xl font-bold text-zinc-100">
        {value} <span className="text-sm font-normal text-zinc-500">min</span>
      </div>
      <button
        type="button"
        onClick={() => onChange(value + step)}
        aria-label="More"
        className="flex h-10 w-10 items-center justify-center rounded-full text-xl text-zinc-950"
        style={{ background: TEAL }}
      >
        +
      </button>
    </div>
  );
}

function Bar({ value, height, color }: { value: number; height: number; color: string }) {
  const p = Math.max(0, Math.min(1, value));
  return (
    <div className="overflow-hidden rounded-full bg-zinc-800" style={{ height }}>
      <div
        className="h-full rounded-full transition-[width] duration-500"
        style={{ width: `${p * 100}%`, background: color }}
      />
    </div>
  );
}

function Ring({
  size,
  stroke,
  progress,
  color,
  glow,
  children,
}: {
  size: number;
  stroke: number;
  progress: number;
  color: string;
  glow?: boolean;
  children?: React.ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(1, progress));
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#27272a" strokeWidth={stroke} />
        {glow && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${c * v} ${c}`}
            style={{ filter: "blur(6px)", opacity: 0.5 }}
          />
        )}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${c * v} ${c}`}
          style={{ transition: "stroke-dasharray .6s cubic-bezier(.4,0,.2,1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  );
}

function Sheet({
  onClose,
  title,
  sub,
  children,
}: {
  onClose: () => void;
  title?: string;
  sub?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center [animation:foc-fade_.2s_ease]" role="dialog" aria-modal="true">
      <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative max-h-[88%] w-full max-w-3xl overflow-y-auto rounded-t-3xl border border-zinc-800 bg-zinc-950 p-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] [animation:foc-sheet_.32s_cubic-bezier(.32,.72,0,1)]">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-zinc-700" />
        {title && <h2 className="text-[22px] font-bold text-zinc-100">{title}</h2>}
        {sub && <p className="mt-0.5 text-[15px] text-zinc-400">{sub}</p>}
        {children}
      </div>
    </div>
  );
}

function Keyframes() {
  return (
    <style>{`
      @keyframes foc-fade { from { opacity: 0 } to { opacity: 1 } }
      @keyframes foc-sheet { from { transform: translateY(100%) } to { transform: translateY(0) } }
      @keyframes foc-breathe { 0%,100% { transform: scale(1) } 50% { transform: scale(1.035) } }
      @keyframes foc-toast { from { transform: translateY(8px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
    `}</style>
  );
}
