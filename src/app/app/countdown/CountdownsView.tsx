"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { addCountdownAction, deleteCountdownAction, updateCountdownAction } from "./actions";
import {
  type Countdown,
  type ResolvedCountdown,
  resolveAll,
  breakdown,
  pickGranularity,
  formatBreakdown,
} from "./lib";

const DEFAULT_CATEGORIES = ["Birthday", "Medical", "Holiday", "Travel", "Work", "Personal"];
const CATEGORY_COLORS: Record<string, string> = {
  Birthday: "bg-pink-500",
  Medical: "bg-rose-500",
  Holiday: "bg-emerald-500",
  Travel: "bg-sky-500",
  Work: "bg-violet-500",
  Personal: "bg-amber-500",
};
const FALLBACK_COLORS = ["bg-cyan-500", "bg-lime-500", "bg-orange-500", "bg-indigo-500"];

function colorFor(category: string | null, fallbackIndex = 0): string {
  if (!category) return "bg-zinc-700";
  return CATEGORY_COLORS[category] ?? FALLBACK_COLORS[fallbackIndex % FALLBACK_COLORS.length];
}

export function CountdownsView({ rows }: { rows: Countdown[] }) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const resolved = useMemo(() => resolveAll(rows, now), [rows, now]);
  const upcoming = resolved.filter((r) => !r.isPast);
  const past = resolved.filter((r) => r.isPast).slice(0, 10);

  const recentCategories = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const r of rows) {
      if (!r.category) continue;
      if (seen.has(r.category)) continue;
      seen.add(r.category);
      out.push(r.category);
      if (out.length >= 6) break;
    }
    if (out.length === 0) return DEFAULT_CATEGORIES;
    return out;
  }, [rows]);

  return (
    <div>
      <Intro />
      <AddForm recentCategories={recentCategories} />

      <Section title="Upcoming" empty="Nothing on the horizon yet.">
        {upcoming.map((r, i) => (
          <CountdownCard key={r.id} item={r} now={now} fallbackIndex={i} recentCategories={recentCategories} />
        ))}
      </Section>

      {past.length > 0 && (
        <Section title="Just passed">
          {past.map((r, i) => (
            <CountdownCard key={r.id} item={r} now={now} fallbackIndex={i} recentCategories={recentCategories} />
          ))}
        </Section>
      )}
    </div>
  );
}

function Intro() {
  return (
    <div className="mb-4 rounded-2xl border border-zinc-800 bg-zinc-900/30 p-3 text-xs text-zinc-400">
      <span className="font-semibold text-zinc-300">Count down to what matters</span>{" "}
      — add the dates you&apos;re waiting on and watch the days tick away. Flag
      one as{" "}
      <span className="font-semibold text-cyan-400">recurring</span> and it rolls
      to next year the moment it passes.
    </div>
  );
}

function Section({
  title,
  empty,
  children,
}: {
  title: string;
  empty?: string;
  children: React.ReactNode;
}) {
  const arr = Array.isArray(children) ? children : [children];
  const isEmpty = arr.filter(Boolean).length === 0;
  return (
    <div className="mt-6">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
        {title}
      </h3>
      {isEmpty && empty ? (
        <p className="text-sm text-zinc-500">{empty}</p>
      ) : (
        <ul className="space-y-2">{children}</ul>
      )}
    </div>
  );
}

interface CountdownFormValues {
  title: string;
  date: string;
  time: string;
  category: string;
  recurring: boolean;
  note: string;
}

// Shared field set for both the add form and the per-card edit form.
function CountdownFields({
  heading,
  submitLabel,
  recentCategories,
  initial,
  pending,
  onSubmit,
  onCancel,
}: {
  heading: string;
  submitLabel: string;
  recentCategories: string[];
  initial: CountdownFormValues;
  pending: boolean;
  onSubmit: (v: CountdownFormValues) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(initial.title);
  const [date, setDate] = useState(initial.date);
  const [time, setTime] = useState(initial.time);
  const [category, setCategory] = useState(initial.category);
  const [customCategory, setCustomCategory] = useState(
    !!initial.category && !recentCategories.includes(initial.category),
  );
  const [recurring, setRecurring] = useState(initial.recurring);
  const [note, setNote] = useState(initial.note);

  function submit() {
    if (!title.trim() || !date) return;
    onSubmit({ title: title.trim(), date, time, category: category.trim(), recurring, note });
  }

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
      <div className="flex items-center justify-between">
        <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
          {heading}
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg px-2 py-1 text-xs text-zinc-500 hover:text-zinc-300"
        >
          Close
        </button>
      </div>

      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        autoComplete="off"
        autoFocus
        placeholder="What are you counting down to?"
        className="mt-3 w-full rounded-lg bg-zinc-900 px-3 py-2 text-base text-zinc-100 placeholder:text-zinc-500 outline-none ring-1 ring-zinc-800 focus:ring-cyan-500/50"
      />

      <div className="mt-3 flex flex-wrap gap-2">
        <label className="flex flex-1 flex-col gap-1">
          <span className="text-[10px] uppercase tracking-wider text-zinc-500">Date</span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-lg bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none ring-1 ring-zinc-800 focus:ring-cyan-500/50"
          />
        </label>
        <label className="flex flex-1 flex-col gap-1">
          <span className="text-[10px] uppercase tracking-wider text-zinc-500">Time (optional)</span>
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="rounded-lg bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none ring-1 ring-zinc-800 focus:ring-cyan-500/50"
          />
        </label>
      </div>

      <div className="mt-3">
        <div className="text-[10px] uppercase tracking-wider text-zinc-500">Category</div>
        <div className="mt-1.5 flex flex-wrap gap-2">
          {recentCategories.map((c, i) => (
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
              <span className={`inline-block h-2 w-2 rounded-full ${colorFor(c, i)}`} />
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
            className="mt-2 w-full rounded-lg bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none ring-1 ring-zinc-800 focus:ring-cyan-500/50"
          />
        )}
      </div>

      <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm text-zinc-300">
        <input
          type="checkbox"
          checked={recurring}
          onChange={(e) => setRecurring(e.target.checked)}
          className="h-4 w-4 accent-cyan-500"
        />
        Repeats every year (birthday, anniversary, holiday…)
      </label>

      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Note (optional)"
        className="mt-3 w-full rounded-lg bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none ring-1 ring-zinc-800 focus:ring-cyan-500/50"
      />

      <button
        type="button"
        onClick={submit}
        disabled={pending || !title.trim() || !date}
        className="mt-4 h-11 w-full rounded-xl bg-cyan-500 text-sm font-semibold text-zinc-950 hover:bg-cyan-400 disabled:opacity-40"
      >
        {pending ? "Saving…" : submitLabel}
      </button>
    </div>
  );
}

function AddForm({ recentCategories }: { recentCategories: string[] }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/30 text-sm font-semibold text-zinc-400 hover:border-cyan-500/40 hover:text-cyan-300"
      >
        <span aria-hidden>+</span> Add a countdown
      </button>
    );
  }

  return (
    <CountdownFields
      heading="New countdown"
      submitLabel="Add countdown"
      recentCategories={recentCategories}
      initial={{ title: "", date: todayInput(), time: "", category: "", recurring: false, note: "" }}
      pending={pending}
      onCancel={() => setOpen(false)}
      onSubmit={(v) =>
        start(async () => {
          await addCountdownAction(v.title, v.date, v.time, v.category, v.recurring, v.note);
          setOpen(false);
        })
      }
    />
  );
}

function CountdownCard({
  item,
  now,
  fallbackIndex,
  recentCategories,
}: {
  item: ResolvedCountdown;
  now: Date;
  fallbackIndex: number;
  recentCategories: string[];
}) {
  const [pending, start] = useTransition();
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <li>
        <CountdownFields
          heading="Edit countdown"
          submitLabel="Save"
          recentCategories={recentCategories}
          initial={{
            title: item.title,
            date: item.target_date,
            time: item.target_time ?? "",
            category: item.category ?? "",
            recurring: item.recurring_yearly,
            note: item.note ?? "",
          }}
          pending={pending}
          onCancel={() => setEditing(false)}
          onSubmit={(v) =>
            start(async () => {
              await updateCountdownAction(item.id, v.title, v.date, v.time, v.category, v.recurring, v.note);
              setEditing(false);
            })
          }
        />
      </li>
    );
  }

  const b = breakdown(now, item.nextAt);
  const granularity = pickGranularity(b.totalMs);
  const formatted = formatBreakdown(b, granularity);
  const isImminent = granularity === "imminent" && !item.isPast;
  const cat = item.category;
  const dot = colorFor(cat, fallbackIndex);

  const dateLabel = item.nextAt.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: yearMattersForLabel(item.nextAt, now) ? "numeric" : undefined,
  });
  const timeLabel = item.target_time
    ? item.nextAt.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
    : null;

  function remove() {
    if (!confirm(`Delete "${item.title}"?`)) return;
    start(() => deleteCountdownAction(item.id));
  }

  return (
    <li
      className={`relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 ${
        pending ? "opacity-50" : ""
      }`}
    >
      <div className="flex items-start gap-3">
        <span className={`mt-1.5 inline-block h-2.5 w-2.5 shrink-0 rounded-full ${dot}`} />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className="truncate text-base font-semibold text-zinc-100">{item.title}</span>
            {item.recurring_yearly && (
              <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                Yearly
              </span>
            )}
          </div>
          <div className="mt-0.5 text-xs text-zinc-500">
            {dateLabel}
            {timeLabel && <> · {timeLabel}</>}
            {cat && <> · {cat}</>}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="rounded-lg p-1 text-zinc-600 hover:bg-zinc-800 hover:text-cyan-400"
            aria-label="Edit"
          >
            ✎
          </button>
          <button
            type="button"
            onClick={remove}
            className="rounded-lg p-1 text-zinc-600 hover:bg-zinc-800 hover:text-red-400"
            aria-label="Delete"
          >
            ×
          </button>
        </div>
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <span
          className={`tabular-nums tracking-tight ${
            isImminent ? "text-3xl font-bold text-emerald-400" : item.isPast ? "text-xl font-semibold text-zinc-400" : "text-2xl font-bold text-cyan-400"
          }`}
        >
          {formatted}
        </span>
        <span className="text-xs text-zinc-500">
          {item.isPast ? "ago" : isImminent ? "left" : "to go"}
        </span>
      </div>

      {item.note && <div className="mt-2 truncate text-xs text-zinc-400">{item.note}</div>}
    </li>
  );
}

function todayInput(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function yearMattersForLabel(target: Date, now: Date): boolean {
  return target.getFullYear() !== now.getFullYear();
}
