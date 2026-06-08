"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { addTimeEntryAction, deleteTimeEntryAction, setTimeBudgetAction } from "./actions";

const DURATION_PRESETS = [15, 30, 45, 60, 90, 120];
const DEFAULT_CATEGORIES = ["Deep work", "Meetings", "Exercise", "Family", "Learning", "Chores"];
const STEP = 30; // minutes — both the target stepper and the +30m quick-log
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
interface Budget {
  label: string | null;
  value: number | string;
}

export function TimeTrackerView({ entries, budgets }: { entries: Entry[]; budgets: Budget[] }) {
  // Stable color per category — seeded from logged categories, then any budget-only ones.
  const colorMap = useMemo(() => {
    const map = new Map<string, string>();
    let i = 0;
    const assign = (raw: string | null) => {
      const k = (raw || "Uncategorized").trim();
      if (k && !map.has(k)) map.set(k, CATEGORY_COLORS[i++ % CATEGORY_COLORS.length]);
    };
    for (const e of entries) assign(e.label);
    for (const b of budgets) assign(b.label);
    return map;
  }, [entries, budgets]);
  const colorFor = (c: string) => colorMap.get(c) ?? CATEGORY_COLORS[0];

  const recentCategories = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const e of entries) {
      const k = (e.label || "").trim();
      if (!k || seen.has(k)) continue;
      seen.add(k);
      out.push(k);
      if (out.length >= 8) break;
    }
    return out.length ? out : DEFAULT_CATEGORIES;
  }, [entries]);

  // Week-to-date spent per category (Monday-start week), from the entries store.
  const baseSpent = useMemo(() => {
    const start = startOfWeek().getTime();
    const m: Record<string, number> = {};
    for (const e of entries) {
      if (new Date(e.created_at).getTime() < start) continue;
      const k = (e.label || "Uncategorized").trim();
      m[k] = (m[k] ?? 0) + (Number(e.value) || 0);
    }
    return m;
  }, [entries]);

  // Optimistic +30m overlay — reset (during render, not in an effect) whenever the
  // server sends a fresh entries array, so the optimistic bump and the real row never
  // double-count.
  const [optimistic, setOptimistic] = useState<{ ref: Entry[]; map: Record<string, number> }>({
    ref: entries,
    map: {},
  });
  if (optimistic.ref !== entries) setOptimistic({ ref: entries, map: {} });
  const optimisticMap = optimistic.map;
  const spentFor = (c: string) => (baseSpent[c] ?? 0) + (optimisticMap[c] ?? 0);

  // Weekly targets — seeded from props once; the source of truth while on-screen.
  const [targets, setTargets] = useState<Record<string, number>>(() => {
    const m: Record<string, number> = {};
    for (const b of budgets) {
      const k = (b.label || "").trim();
      if (k) m[k] = Number(b.value) || 0;
    }
    return m;
  });
  const targetFor = (c: string) => targets[c] ?? 0;

  const [editing, setEditing] = useState(false);
  const [logOpen, setLogOpen] = useState(false);
  const [, startEntry] = useTransition();
  const [, startBudget] = useTransition();

  function quickLog(category: string) {
    setOptimistic((o) => ({ ref: o.ref, map: { ...o.map, [category]: (o.map[category] ?? 0) + STEP } }));
    startEntry(() => addTimeEntryAction(category, STEP, ""));
  }
  function bumpTarget(category: string, delta: number) {
    const next = Math.max(0, (targets[category] ?? 0) + delta);
    setTargets((t) => ({ ...t, [category]: Math.max(0, (t[category] ?? 0) + delta) }));
    startBudget(() => setTimeBudgetAction(category, next));
  }

  // Categories shown: those with a budget or week-spend (view), plus recents (adjust).
  // Order is deliberately STABLE during interaction so steppers / +30m don't jump:
  //   • view mode sorts by pace using server-side spend (baseSpent), so an optimistic
  //     +30m grows a bar without reordering until the next server refresh;
  //   • adjust mode sorts alphabetically, so editing a target never moves the card.
  const categories = useMemo(() => {
    const set = new Set<string>();
    Object.keys(targets).forEach((k) => targets[k] > 0 && set.add(k));
    Object.keys(baseSpent).forEach((k) => baseSpent[k] > 0 && set.add(k));
    Object.keys(optimisticMap).forEach((k) => optimisticMap[k] > 0 && set.add(k));
    if (editing) recentCategories.forEach((k) => set.add(k));
    if (editing) return [...set].sort((a, b) => a.localeCompare(b));
    const ratio = (c: string) => {
      const t = targets[c] ?? 0;
      const s = baseSpent[c] ?? 0;
      return t > 0 ? s / t : s > 0 ? Infinity : -1; // unbudgeted-with-spend bubbles up
    };
    return [...set].sort((a, b) => ratio(b) - ratio(a));
  }, [targets, baseSpent, optimisticMap, editing, recentCategories]);

  const totalSpent = categories.reduce((s, c) => s + spentFor(c), 0);
  const totalBudget = Object.values(targets).reduce((s, t) => s + t, 0);
  const overCats = categories.filter((c) => targetFor(c) > 0 && spentFor(c) > targetFor(c));
  const dayFrac = daysElapsed() / 7;
  const hasBudgets = totalBudget > 0;
  const projected = dayFrac > 0 ? Math.round(totalSpent / dayFrac) : totalSpent;

  return (
    <div className="pb-28">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Eyebrow>Week of {weekOfLabel()}</Eyebrow>
          <h2 className="mt-1 text-[28px] font-bold tracking-tight text-zinc-100">Time budget</h2>
        </div>
        <button
          type="button"
          onClick={() => setEditing((e) => !e)}
          className={`mt-1 h-9 rounded-xl px-3.5 text-[13px] font-semibold transition ${
            editing
              ? "bg-zinc-100 text-zinc-900"
              : "border border-zinc-800 bg-zinc-900/40 text-zinc-200 hover:bg-zinc-900"
          }`}
        >
          {editing ? "Done" : "Adjust"}
        </button>
      </div>

      {/* Hero summary */}
      <div className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-[18px]">
        <div className="flex items-baseline justify-between">
          <div className="text-3xl font-bold tracking-tight text-zinc-100 tabular-nums">
            {fmt(totalSpent)}
          </div>
          <div className="text-sm font-semibold text-zinc-500">
            {hasBudgets ? `of ${fmt(totalBudget)} budget` : "this week"}
          </div>
        </div>
        {hasBudgets && (
          <div className="my-3 h-2 overflow-hidden rounded-full bg-zinc-800">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                totalSpent > totalBudget ? "bg-rose-500" : "bg-cyan-500"
              }`}
              style={{ width: `${Math.min(100, totalBudget ? (totalSpent / totalBudget) * 100 : 0)}%` }}
            />
          </div>
        )}
        <p className="mt-2 text-[13px] leading-relaxed text-zinc-400">
          {!hasBudgets ? (
            <>Set a weekly budget per category to track your pace — tap <b className="text-zinc-200">Adjust</b>.</>
          ) : overCats.length === 0 ? (
            <>On pace across the board.</>
          ) : (
            <>
              <span className="font-semibold text-rose-400">
                {overCats.length} {overCats.length === 1 ? "category is" : "categories are"} over budget
              </span>{" "}
              — {overCats.map((c) => c).join(" & ")}. Trim or rebalance.
            </>
          )}
        </p>
      </div>

      {/* By category */}
      {categories.length > 0 && (
        <>
          <Eyebrow className="mb-3 mt-5">By category</Eyebrow>
          <div className="flex flex-col gap-2.5">
            {categories.map((c) => (
              <CategoryCard
                key={c}
                category={c}
                spent={spentFor(c)}
                target={targetFor(c)}
                dayFrac={dayFrac}
                colorClass={colorFor(c)}
                editing={editing}
                onDown={() => bumpTarget(c, -STEP)}
                onUp={() => bumpTarget(c, STEP)}
                onQuickLog={() => quickLog(c)}
              />
            ))}
          </div>
        </>
      )}

      {/* Projection */}
      {hasBudgets && (
        <div className="mt-5 rounded-2xl border border-dashed border-zinc-700 bg-zinc-900/30 p-4">
          <Eyebrow className="mb-2">Projection</Eyebrow>
          <p className="text-[13.5px] leading-relaxed text-zinc-400">
            At today&rsquo;s rate you&rsquo;ll close the week around{" "}
            <b className="text-zinc-100">{fmt(projected)}</b> —{" "}
            {projected > totalBudget ? (
              <span className="text-rose-400">{fmt(projected - totalBudget)} over budget</span>
            ) : (
              <span className="text-emerald-400">within budget</span>
            )}
            .
          </p>
        </div>
      )}

      {/* Recent entries (management) */}
      <RecentEntries entries={entries.slice(0, 20)} colorFor={colorFor} />

      {/* FAB */}
      <button
        type="button"
        onClick={() => setLogOpen(true)}
        style={{ bottom: "calc(64px + env(safe-area-inset-bottom) + 1rem)" }}
        className="fixed right-4 z-20 flex h-[50px] items-center gap-2 rounded-full bg-cyan-500 pl-5 pr-6 text-base font-semibold text-zinc-950 shadow-lg shadow-cyan-500/30 hover:bg-cyan-400 active:scale-95"
      >
        <span className="text-xl leading-none">+</span> Log time
      </button>

      {logOpen && (
        <LogSheet
          recentCategories={recentCategories}
          colorFor={colorFor}
          onClose={() => setLogOpen(false)}
        />
      )}
    </div>
  );
}

// ─────────────────────────── Category card ───────────────────────────

function CategoryCard({
  category,
  spent,
  target,
  dayFrac,
  colorClass,
  editing,
  onDown,
  onUp,
  onQuickLog,
}: {
  category: string;
  spent: number;
  target: number;
  dayFrac: number;
  colorClass: string;
  editing: boolean;
  onDown: () => void;
  onUp: () => void;
  onQuickLog: () => void;
}) {
  const budgeted = target > 0;
  const over = budgeted && spent > target;
  const remaining = target - spent;
  const pct = budgeted ? Math.min(100, (spent / target) * 100) : spent > 0 ? 100 : 0;
  const pacePct = budgeted && dayFrac > 0 ? spent / target / dayFrac : 0;

  let pillText: string;
  let pillClass: string;
  if (!budgeted) {
    pillText = "No budget";
    pillClass = "text-zinc-500";
  } else if (over) {
    pillText = `${fmt(spent - target)} over`;
    pillClass = "text-rose-400";
  } else if (pacePct > 1.05) {
    pillText = "Ahead of pace";
    pillClass = "text-amber-400";
  } else if (pacePct < 0.7) {
    pillText = "Behind pace";
    pillClass = "text-amber-400";
  } else {
    pillText = "On pace";
    pillClass = "text-emerald-400";
  }

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-3.5">
      <div className="mb-2.5 flex items-center gap-2.5">
        <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${colorClass}`} />
        <span className="flex-1 truncate text-[14.5px] font-semibold text-zinc-100">{category}</span>
        {editing ? (
          <Stepper onDown={onDown} onUp={onUp} />
        ) : (
          <span className="text-[13px] text-zinc-400 tabular-nums">
            <b className="text-zinc-100">{fmt(spent)}</b>
            {budgeted ? ` / ${fmt(target)}` : ""}
          </span>
        )}
      </div>

      <div className="relative h-[9px] overflow-hidden rounded-full bg-zinc-800">
        <div
          className={`h-full rounded-full transition-all duration-500 ${over ? "bg-rose-500" : colorClass}`}
          style={{ width: `${pct}%` }}
        />
        {/* even-pace marker */}
        {budgeted && (
          <span
            className="absolute -top-0.5 -bottom-0.5 w-0.5 rounded bg-zinc-600"
            style={{ left: `${Math.min(100, dayFrac * 100)}%` }}
            title="today's pace"
          />
        )}
      </div>

      <div className="mt-2 flex items-center justify-between">
        <span className={`text-[12px] font-semibold ${pillClass}`}>{pillText}</span>
        <div className="flex items-center gap-3">
          {budgeted && !over && <span className="text-[12px] text-zinc-500">{fmt(remaining)} left</span>}
          {!editing && (
            <button
              type="button"
              onClick={onQuickLog}
              className="h-7 rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 text-[12px] font-semibold text-zinc-200 hover:bg-zinc-800"
            >
              +30m
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Stepper({ onDown, onUp }: { onDown: () => void; onUp: () => void }) {
  const cls =
    "flex h-[30px] w-[30px] items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900 text-lg font-semibold text-zinc-200 leading-none hover:bg-zinc-800 active:scale-95";
  return (
    <div className="flex gap-1.5">
      <button type="button" onClick={onDown} className={cls} aria-label="Decrease budget">
        –
      </button>
      <button type="button" onClick={onUp} className={cls} aria-label="Increase budget">
        +
      </button>
    </div>
  );
}

// ─────────────────────────── Log sheet (FAB) ───────────────────────────

function LogSheet({
  recentCategories,
  colorFor,
  onClose,
}: {
  recentCategories: string[];
  colorFor: (c: string) => string;
  onClose: () => void;
}) {
  const [category, setCategory] = useState("");
  const [minutes, setMinutes] = useState(30);
  const [custom, setCustom] = useState(false);
  const noteRef = useRef<HTMLInputElement>(null);
  const [pending, start] = useTransition();

  function submit() {
    const cat = category.trim();
    if (!cat || minutes <= 0) return;
    const note = noteRef.current?.value || "";
    start(async () => {
      await addTimeEntryAction(cat, minutes, note);
      onClose();
    });
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center" role="dialog" aria-modal="true">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />
      <div className="relative w-full max-w-3xl rounded-t-3xl border border-zinc-800 bg-zinc-950 p-5 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-zinc-700" />
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-semibold text-zinc-100">Log time</h3>
          <button type="button" onClick={onClose} className="text-sm text-zinc-400 hover:text-zinc-200">
            Cancel
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {recentCategories.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => {
                setCategory(c);
                setCustom(false);
              }}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                !custom && category === c
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
              setCustom(true);
              setCategory("");
            }}
            className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
              custom
                ? "border-cyan-500/50 bg-cyan-500/10 text-cyan-200"
                : "border-zinc-800 bg-zinc-900 text-zinc-300 hover:border-zinc-700"
            }`}
          >
            + New
          </button>
        </div>

        {custom && (
          <input
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            autoComplete="off"
            autoFocus
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
              {fmt(m)}
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
          className="mt-4 h-12 w-full rounded-xl bg-cyan-500 text-sm font-semibold text-zinc-950 hover:bg-cyan-400 disabled:opacity-40"
        >
          {pending ? "Saving…" : category.trim() ? `Log ${fmt(minutes)} on ${category.trim()}` : "Pick a category"}
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────── Recent entries ───────────────────────────

function RecentEntries({ entries, colorFor }: { entries: Entry[]; colorFor: (c: string) => string }) {
  if (entries.length === 0) return null;
  return (
    <div className="mt-7">
      <Eyebrow className="mb-2">Recent entries</Eyebrow>
      <ul className="space-y-2">
        {entries.map((e) => (
          <EntryRow key={e.id} entry={e} colorFor={colorFor} />
        ))}
      </ul>
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
      <div className="text-sm font-semibold text-cyan-400 tabular-nums">{fmt(minutes)}</div>
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

// ─────────────────────────── bits + helpers ───────────────────────────

function Eyebrow({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`text-[11.5px] font-bold uppercase tracking-[0.1em] text-zinc-500 ${className}`}>
      {children}
    </div>
  );
}

function fmt(min: number): string {
  const m = Math.round(min);
  if (m <= 0) return "0m";
  const h = Math.floor(m / 60);
  const rem = m % 60;
  if (h && rem) return `${h}h ${rem}m`;
  if (h) return `${h}h`;
  return `${rem}m`;
}

// Monday-start week boundary in local time.
function startOfWeek(d = new Date()): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const dow = (x.getDay() + 6) % 7; // Mon = 0
  x.setDate(x.getDate() - dow);
  return x;
}

// Days elapsed in the current week, including today (Mon=1 … Sun=7).
function daysElapsed(d = new Date()): number {
  return ((d.getDay() + 6) % 7) + 1;
}

function weekOfLabel(): string {
  return startOfWeek().toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
