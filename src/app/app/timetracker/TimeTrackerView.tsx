"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { addTimeEntryAction, deleteTimeEntryAction } from "./actions";

const DURATION_PRESETS = [15, 30, 45, 60, 90, 120];
const DEFAULT_CATEGORIES = ["Work", "Meetings", "Email", "Deep work", "Errands", "Reading"];
const CATEGORY_COLORS = [
  "bg-cyan-500",
  "bg-emerald-500",
  "bg-violet-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-sky-500",
  "bg-lime-500",
  "bg-pink-500",
  "bg-orange-500",
  "bg-indigo-500",
];

interface Entry {
  id: number;
  value: number | string;
  label: string | null;
  note: string | null;
  created_at: string;
}

export function TimeTrackerView({ entries }: { entries: Entry[] }) {
  const categoryColorMap = useMemo(() => {
    const map = new Map<string, string>();
    let i = 0;
    for (const e of entries) {
      const k = (e.label || "Uncategorized").trim();
      if (!map.has(k)) {
        map.set(k, CATEGORY_COLORS[i % CATEGORY_COLORS.length]);
        i += 1;
      }
    }
    return map;
  }, [entries]);

  function colorFor(category: string) {
    return categoryColorMap.get(category) ?? CATEGORY_COLORS[0];
  }

  const recentCategories = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const e of entries) {
      const k = (e.label || "").trim();
      if (!k || seen.has(k)) continue;
      seen.add(k);
      out.push(k);
      if (out.length >= 6) break;
    }
    if (out.length === 0) return DEFAULT_CATEGORIES;
    return out;
  }, [entries]);

  const todayBreakdown = useMemo(() => bucketToday(entries), [entries]);
  const weekBreakdown = useMemo(() => bucketByDay(entries, 7), [entries]);

  return (
    <div>
      <TodayCard breakdown={todayBreakdown} colorFor={colorFor} />
      <LogForm recentCategories={recentCategories} colorFor={colorFor} />
      <WeekChart breakdown={weekBreakdown} colorFor={colorFor} />
      <History entries={entries.slice(0, 30)} colorFor={colorFor} />
    </div>
  );
}

function LogForm({
  recentCategories,
  colorFor,
}: {
  recentCategories: string[];
  colorFor: (c: string) => string;
}) {
  const [category, setCategory] = useState("");
  const [minutes, setMinutes] = useState(30);
  const [customCategory, setCustomCategory] = useState(false);
  const noteRef = useRef<HTMLInputElement>(null);
  const [pending, start] = useTransition();

  function submit() {
    const cat = category.trim();
    if (!cat || minutes <= 0) return;
    const note = noteRef.current?.value || "";
    start(async () => {
      await addTimeEntryAction(cat, minutes, note);
      if (noteRef.current) noteRef.current.value = "";
      setCategory("");
      setCustomCategory(false);
    });
  }

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
      <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
        Log time
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {recentCategories.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => {
              setCategory(c);
              setCustomCategory(false);
            }}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
              !customCategory && category === c
                ? "border-cyan-500/50 bg-cyan-500/10 text-cyan-200"
                : "border-zinc-800 bg-zinc-900 text-zinc-300 hover:border-zinc-700"
            }`}
          >
            <span className={`inline-block h-2 w-2 rounded-full ${colorFor(c)}`} />
            {c}
          </button>
        ))}
        <button
          type="button"
          onClick={() => {
            setCustomCategory(true);
            setCategory("");
          }}
          className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
            customCategory
              ? "border-cyan-500/50 bg-cyan-500/10 text-cyan-200"
              : "border-zinc-800 bg-zinc-900 text-zinc-300 hover:border-zinc-700"
          }`}
        >
          + New
        </button>
      </div>

      {customCategory && (
        <input
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          autoComplete="off"
          placeholder="New category name"
          className="mt-3 w-full rounded-lg bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none ring-1 ring-zinc-800 focus:ring-cyan-500/50"
        />
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {DURATION_PRESETS.map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMinutes(m)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              minutes === m
                ? "bg-cyan-500/20 text-cyan-300 ring-1 ring-cyan-500/40"
                : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
            }`}
          >
            {formatMinutes(m)}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-1">
          <input
            type="number"
            min={1}
            max={1440}
            value={minutes}
            onChange={(e) => setMinutes(Math.max(1, Math.min(1440, Number(e.target.value) || 1)))}
            className="w-20 rounded-lg bg-zinc-900 px-2 py-1.5 text-center text-sm text-zinc-100 outline-none ring-1 ring-zinc-800 focus:ring-cyan-500/50"
          />
          <span className="text-xs text-zinc-500">min</span>
        </div>
      </div>

      <input
        ref={noteRef}
        placeholder="Note (optional)"
        className="mt-3 w-full rounded-lg bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none ring-1 ring-zinc-800 focus:ring-cyan-500/50"
      />

      <button
        type="button"
        onClick={submit}
        disabled={pending || !category.trim() || minutes <= 0}
        className="mt-3 h-11 w-full rounded-xl bg-cyan-500 text-sm font-semibold text-zinc-950 hover:bg-cyan-400 disabled:opacity-40"
      >
        {pending ? "Saving…" : category.trim() ? `Log ${formatMinutes(minutes)} on ${category.trim()}` : "Pick a category"}
      </button>
    </div>
  );
}

function TodayCard({
  breakdown,
  colorFor,
}: {
  breakdown: { category: string; minutes: number }[];
  colorFor: (c: string) => string;
}) {
  const total = breakdown.reduce((acc, b) => acc + b.minutes, 0);

  return (
    <div className="mb-4 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
      <div className="flex items-baseline justify-between">
        <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
          Today
        </div>
        <div className="text-2xl font-bold tracking-tight text-cyan-400">
          {total > 0 ? formatMinutes(total) : "—"}
        </div>
      </div>
      {total === 0 ? (
        <p className="mt-3 text-sm text-zinc-500">Nothing logged yet today.</p>
      ) : (
        <>
          <div className="mt-3 flex h-3 w-full overflow-hidden rounded-full bg-zinc-800">
            {breakdown.map((b) => (
              <div
                key={b.category}
                title={`${b.category}: ${formatMinutes(b.minutes)}`}
                className={`${colorFor(b.category)} transition-all`}
                style={{ width: `${(b.minutes / total) * 100}%` }}
              />
            ))}
          </div>
          <ul className="mt-3 space-y-1.5">
            {breakdown.map((b) => (
              <li key={b.category} className="flex items-center gap-2 text-sm">
                <span className={`inline-block h-2.5 w-2.5 rounded-full ${colorFor(b.category)}`} />
                <span className="flex-1 truncate text-zinc-200">{b.category}</span>
                <span className="text-zinc-400">{formatMinutes(b.minutes)}</span>
                <span className="w-10 text-right text-xs text-zinc-500">
                  {Math.round((b.minutes / total) * 100)}%
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function WeekChart({
  breakdown,
  colorFor,
}: {
  breakdown: { key: string; short: string; isToday: boolean; total: number; byCategory: { category: string; minutes: number }[] }[];
  colorFor: (c: string) => string;
}) {
  const max = Math.max(1, ...breakdown.map((b) => b.total));

  return (
    <div className="mt-5 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
      <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
        Last 7 days
      </div>
      <div className="flex h-32 items-end gap-1.5">
        {breakdown.map((b) => (
          <div key={b.key} className="flex flex-1 flex-col items-center gap-1">
            <div
              title={`${b.short}: ${formatMinutes(b.total)}`}
              className="flex w-full flex-col-reverse overflow-hidden rounded-md bg-zinc-800/50"
              style={{ height: `${b.total === 0 ? 6 : Math.max(8, Math.round((b.total / max) * 100))}%` }}
            >
              {b.byCategory.map((c) => (
                <div
                  key={c.category}
                  className={colorFor(c.category)}
                  style={{ height: `${(c.minutes / b.total) * 100}%` }}
                />
              ))}
            </div>
            <div className={`text-[10px] ${b.isToday ? "text-cyan-300" : "text-zinc-500"}`}>
              {b.short}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function History({
  entries,
  colorFor,
}: {
  entries: Entry[];
  colorFor: (c: string) => string;
}) {
  return (
    <div className="mt-6">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
        Recent entries
      </h3>
      {entries.length === 0 ? (
        <p className="text-sm text-zinc-500">No entries logged yet.</p>
      ) : (
        <ul className="space-y-2">
          {entries.map((e) => (
            <EntryRow key={e.id} entry={e} colorFor={colorFor} />
          ))}
        </ul>
      )}
    </div>
  );
}

function EntryRow({ entry, colorFor }: { entry: Entry; colorFor: (c: string) => string }) {
  const [pending, start] = useTransition();
  const date = new Date(entry.created_at);
  const dateLabel = date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  const timeLabel = date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  const minutes = Number(entry.value) || 0;
  const category = (entry.label || "Uncategorized").trim();

  function remove() {
    if (!confirm("Delete this entry?")) return;
    start(() => deleteTimeEntryAction(entry.id));
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
        <div className="flex items-center gap-2">
          <span className={`inline-block h-2 w-2 rounded-full ${colorFor(category)}`} />
          <span className="truncate text-sm font-semibold text-zinc-100">{category}</span>
        </div>
        {entry.note && <div className="mt-0.5 truncate text-xs text-zinc-400">{entry.note}</div>}
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

function bucketToday(entries: Entry[]) {
  const todayKey = localDateKey(new Date());
  const byCat = new Map<string, number>();
  for (const e of entries) {
    if (localDateKey(new Date(e.created_at)) !== todayKey) continue;
    const cat = (e.label || "Uncategorized").trim();
    byCat.set(cat, (byCat.get(cat) ?? 0) + (Number(e.value) || 0));
  }
  return Array.from(byCat.entries())
    .map(([category, minutes]) => ({ category, minutes }))
    .sort((a, b) => b.minutes - a.minutes);
}

function bucketByDay(entries: Entry[], days: number) {
  const todayKey = localDateKey(new Date());
  const map = new Map<string, Map<string, number>>();
  for (const e of entries) {
    const dayKey = localDateKey(new Date(e.created_at));
    if (!map.has(dayKey)) map.set(dayKey, new Map());
    const day = map.get(dayKey)!;
    const cat = (e.label || "Uncategorized").trim();
    day.set(cat, (day.get(cat) ?? 0) + (Number(e.value) || 0));
  }
  const out: {
    key: string;
    short: string;
    isToday: boolean;
    total: number;
    byCategory: { category: string; minutes: number }[];
  }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = localDateKey(d);
    const byCat = map.get(key) ?? new Map();
    const byCategory = Array.from(byCat.entries())
      .map(([category, minutes]) => ({ category, minutes }))
      .sort((a, b) => b.minutes - a.minutes);
    const total = byCategory.reduce((acc, c) => acc + c.minutes, 0);
    out.push({
      key,
      short: d.toLocaleDateString(undefined, { weekday: "narrow" }),
      isToday: key === todayKey,
      total,
      byCategory,
    });
  }
  return out;
}
