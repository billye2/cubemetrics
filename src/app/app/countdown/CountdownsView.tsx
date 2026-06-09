"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { addCountdownAction, deleteCountdownAction, updateCountdownAction } from "./actions";
import {
  type Countdown,
  type ResolvedCountdown,
  resolveAll,
  categoryToken,
  displayEmoji,
  hexAlpha,
  fuzzyParts,
  bucketOf,
  BUCKET_ORDER,
  CATEGORY_NAMES,
  progressFraction,
} from "./lib";

const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function CountdownsView({ rows }: { rows: Countdown[] }) {
  const now = useNow();
  const [sheet, setSheet] = useState<null | "new" | ResolvedCountdown>(null);
  const [filter, setFilter] = useState<string>("All");

  const resolved = useMemo(() => resolveAll(rows, now), [rows, now]);
  const upcoming = resolved.filter((r) => !r.isPast);
  const past = resolved.filter((r) => r.isPast);
  const hero = upcoming[0] ?? null;
  const rest = [...upcoming.slice(1), ...past];

  const cats = useMemo(() => {
    const seen = new Set<string>();
    for (const r of rows) if (r.category) seen.add(r.category);
    return [...seen];
  }, [rows]);

  const pool = rest.filter((r) => filter === "All" || r.category === filter);
  const groups: Record<string, ResolvedCountdown[]> = {};
  for (const r of pool) {
    const b = bucketOf(r.nextAt, now);
    (groups[b] = groups[b] || []).push(r);
  }

  return (
    <div className="pb-28">
      {rows.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          {hero && <Hero item={hero} now={now} onEdit={setSheet} />}

          {cats.length > 0 && <FilterRow cats={cats} filter={filter} onPick={setFilter} />}

          {BUCKET_ORDER.filter((b) => groups[b]?.length).map((b) => (
            <Section key={b} label={b} count={groups[b].length}>
              {groups[b].map((r) => (
                <TintCard key={r.id} item={r} now={now} onEdit={setSheet} />
              ))}
            </Section>
          ))}

          {pool.length === 0 && (
            <p className="mt-8 text-center text-sm text-zinc-500">Nothing else in this category.</p>
          )}
        </>
      )}

      <Fab onClick={() => setSheet("new")} />

      {sheet !== null && (
        <EventSheet initial={sheet === "new" ? null : sheet} onClose={() => setSheet(null)} />
      )}
    </div>
  );
}

// ───────────────────────────── Hero ─────────────────────────────

function Hero({
  item,
  now,
  onEdit,
}: {
  item: ResolvedCountdown;
  now: Date;
  onEdit: (e: ResolvedCountdown) => void;
}) {
  const t = categoryToken(item.category);
  const fp = fuzzyParts(item.nextAt.getTime() - now.getTime());
  const pr = progressFraction(item, item.nextAt, now);
  return (
    <button
      type="button"
      onClick={() => onEdit(item)}
      className="flex w-full items-center gap-4 rounded-3xl border border-zinc-800 bg-zinc-900/60 p-5 text-left"
    >
      <Ring size={104} stroke={9} value={pr} color={t.color}>
        <div className="text-center">
          <div className="text-2xl leading-none">{displayEmoji(item)}</div>
          <div className="mt-1 text-[10px] font-bold" style={{ color: t.color }}>
            {Math.round(pr * 100)}%
          </div>
        </div>
      </Ring>
      <div className="min-w-0 flex-1">
        <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">Next up</div>
        <div className="mt-0.5 truncate text-lg font-bold leading-tight text-zinc-100">
          {item.title}
        </div>
        <div className="mt-1.5 flex items-baseline gap-1.5">
          <span className="text-3xl font-extrabold tracking-tight" style={{ color: t.color }}>
            {fp.big}
          </span>
          {fp.small && (
            <span className="text-base font-bold" style={{ color: hexAlpha(t.color, 0.7) }}>
              {fp.small}
            </span>
          )}
        </div>
        <div className="mt-1 text-xs text-zinc-500">{dateTimeLabel(item)}</div>
      </div>
    </button>
  );
}

// ─────────────────────────── Tint card ───────────────────────────

function TintCard({
  item,
  now,
  onEdit,
}: {
  item: ResolvedCountdown;
  now: Date;
  onEdit: (e: ResolvedCountdown) => void;
}) {
  const t = categoryToken(item.category);
  const fp = fuzzyParts(item.nextAt.getTime() - now.getTime());
  const pr = progressFraction(item, item.nextAt, now);
  return (
    <button
      type="button"
      onClick={() => onEdit(item)}
      className="block w-full rounded-2xl p-3.5 text-left transition active:scale-[0.99]"
      style={{ background: hexAlpha(t.color, 0.1), border: `1px solid ${hexAlpha(t.color, 0.28)}` }}
    >
      <div className="flex items-center gap-3">
        <Ring size={52} stroke={5} value={pr} color={t.color}>
          <span className="text-xl leading-none">{displayEmoji(item)}</span>
        </Ring>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[15px] font-bold text-zinc-100">{item.title}</div>
          <div className="mt-0.5 text-xs font-semibold" style={{ color: hexAlpha(t.color, 0.95) }}>
            {dateTimeLabel(item)}
          </div>
          {item.note && <div className="mt-0.5 truncate text-[11.5px] text-zinc-500">{item.note}</div>}
        </div>
        <div className="shrink-0 text-right">
          <div className="text-[19px] font-extrabold leading-none" style={{ color: t.color }}>
            {fp.big}
          </div>
          {fp.small && (
            <div className="mt-0.5 text-xs font-bold" style={{ color: hexAlpha(t.color, 0.7) }}>
              {fp.small}
            </div>
          )}
        </div>
      </div>
    </button>
  );
}

// ─────────────────────── chips / sections / chrome ───────────────────────

function FilterRow({
  cats,
  filter,
  onPick,
}: {
  cats: string[];
  filter: string;
  onPick: (c: string) => void;
}) {
  const chips = ["All", ...cats];
  return (
    <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
      {chips.map((c) => {
        const on = filter === c;
        const color = c === "All" ? "#06b6d4" : categoryToken(c).color;
        return (
          <button
            key={c}
            type="button"
            onClick={() => onPick(c)}
            aria-pressed={on}
            className={`shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition ${
              on ? "text-white" : "bg-zinc-900 text-zinc-400 ring-1 ring-zinc-800 hover:ring-zinc-700"
            }`}
            style={on ? { background: color } : undefined}
          >
            {c}
          </button>
        );
      })}
    </div>
  );
}

function Section({
  label,
  count,
  children,
}: {
  label: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-5">
      <div className="mb-2 flex items-center gap-2 px-0.5">
        <span className="text-[12.5px] font-bold text-zinc-200">{label}</span>
        <span className="rounded-full bg-zinc-800 px-1.5 py-0.5 text-[11px] font-bold text-zinc-400">
          {count}
        </span>
      </div>
      <div className="flex flex-col gap-2.5">{children}</div>
    </div>
  );
}

function Fab({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Add countdown"
      style={{ bottom: "calc(64px + env(safe-area-inset-bottom) + 1rem)" }}
      className="fixed right-4 z-20 flex h-14 w-14 items-center justify-center rounded-full bg-cyan-500 text-3xl font-light leading-none text-zinc-950 shadow-lg shadow-cyan-500/30 hover:bg-cyan-400 active:scale-95"
    >
      +
    </button>
  );
}

function EmptyState() {
  return (
    <div className="mt-8 rounded-3xl border border-zinc-800 bg-zinc-900/40 p-10 text-center">
      <div className="text-4xl">⏳</div>
      <p className="mt-3 text-sm text-zinc-300">No countdowns yet.</p>
      <p className="mt-1 text-xs text-zinc-500">Tap + to add something to look forward to.</p>
    </div>
  );
}

// ─────────────────────── Ring (SVG progress dial) ───────────────────────

function Ring({
  size,
  stroke,
  value,
  color,
  children,
}: {
  size: number;
  stroke: number;
  value: number;
  color: string;
  children: React.ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={hexAlpha(color, 0.18)} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - Math.max(0, Math.min(1, value)))}
          style={{ transition: "stroke-dashoffset .6s cubic-bezier(.4,0,.2,1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  );
}

// ─────────────────────── Bottom sheet (add / edit) ───────────────────────

function Label({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-500 ${className}`}>
      {children}
    </div>
  );
}

function EventSheet({ initial, onClose }: { initial: ResolvedCountdown | null; onClose: () => void }) {
  const init = useMemo(() => deriveInitial(initial), [initial]);
  const [title, setTitle] = useState(init.title);
  const [date, setDate] = useState(init.date);
  const [withTime, setWithTime] = useState(!!init.time);
  const [time, setTime] = useState(init.time);
  const [category, setCategory] = useState(init.category);
  const [recurring, setRecurring] = useState(init.recurring);
  const [note, setNote] = useState(init.note);
  const [emoji, setEmoji] = useState(init.emoji);
  const [pending, start] = useTransition();

  const valid = title.trim().length > 0 && !!date;
  const token = categoryToken(category);
  // What the ring will show: the custom emoji if set, else the category's.
  const shownEmoji = emoji.trim() || token.emoji;

  function submit() {
    if (!valid) return;
    const t = withTime ? time : "";
    start(async () => {
      if (initial) {
        await updateCountdownAction(initial.id, title.trim(), date, t, category, recurring, note.trim(), emoji);
      } else {
        await addCountdownAction(title.trim(), date, t, category, recurring, note.trim(), emoji);
      }
      onClose();
    });
  }

  function del() {
    if (!initial) return;
    if (!confirm(`Delete "${initial.title}"?`)) return;
    start(async () => {
      await deleteCountdownAction(initial.id);
      onClose();
    });
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center" role="dialog" aria-modal="true">
      <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative max-h-[88%] w-full max-w-3xl overflow-y-auto rounded-t-3xl border border-zinc-800 bg-zinc-950 p-5 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-zinc-700" />
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-zinc-100">{initial ? "Edit countdown" : "New countdown"}</h3>
          <button type="button" onClick={onClose} className="text-sm text-zinc-400 hover:text-zinc-200">
            Cancel
          </button>
        </div>

        <Label>What are you counting down to?</Label>
        <div className="flex items-center gap-2">
          <input
            value={emoji}
            onChange={(e) => setEmoji(e.target.value.slice(0, 8))}
            aria-label="Emoji"
            placeholder={token.emoji}
            className="h-11 w-11 shrink-0 rounded-xl bg-zinc-900 text-center text-xl text-zinc-100 outline-none ring-1 ring-zinc-800 placeholder:opacity-70 focus:ring-cyan-500/50"
          />
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
            autoComplete="off"
            placeholder="e.g. Trip to Tokyo"
            className="flex-1 rounded-xl bg-zinc-900 px-3 py-2.5 text-base text-zinc-100 placeholder:text-zinc-500 outline-none ring-1 ring-zinc-800 focus:ring-cyan-500/50"
          />
        </div>
        <div className="mt-1 text-[11px] text-zinc-600">
          Ring shows <span className="text-zinc-300">{shownEmoji}</span> — leave blank to use the
          category emoji.
        </div>

        <div className="mt-4 flex gap-3">
          <div className="flex-1">
            <Label>Date</Label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-xl bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100 outline-none ring-1 ring-zinc-800 focus:ring-cyan-500/50"
            />
          </div>
          <div className="flex-1">
            <div className="mb-1.5 flex items-center justify-between">
              <Label className="mb-0">Time</Label>
              <button
                type="button"
                onClick={() => {
                  setWithTime((v) => !v);
                  if (withTime) setTime("");
                }}
                className="text-xs font-semibold text-cyan-400"
              >
                {withTime ? "Clear" : "+ Add"}
              </button>
            </div>
            {withTime ? (
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full rounded-xl bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100 outline-none ring-1 ring-zinc-800 focus:ring-cyan-500/50"
              />
            ) : (
              <div className="rounded-xl bg-zinc-900 px-3 py-2.5 text-sm text-zinc-500 ring-1 ring-zinc-800">
                All day
              </div>
            )}
          </div>
        </div>

        <div className="mt-4">
          <Label>Category</Label>
          <div className="flex flex-wrap gap-2">
            {CATEGORY_NAMES.map((name) => {
              const tk = categoryToken(name);
              const on = category === name;
              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => setCategory(name)}
                  aria-pressed={on}
                  className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-semibold transition"
                  style={
                    on
                      ? { background: hexAlpha(tk.color, 0.18), border: `1.5px solid ${tk.color}`, color: tk.color }
                      : { border: "1.5px solid transparent", background: "#18181b", color: "#a1a1aa" }
                  }
                >
                  <span className="h-2 w-2 rounded-full" style={{ background: tk.color }} />
                  {name}
                </button>
              );
            })}
          </div>
        </div>

        <label className="mt-4 flex cursor-pointer items-center gap-2 text-sm text-zinc-300">
          <input
            type="checkbox"
            checked={recurring}
            onChange={(e) => setRecurring(e.target.checked)}
            className="h-4 w-4 accent-cyan-500"
          />
          Repeats every year
        </label>

        <div className="mt-4">
          <Label>Note (optional)</Label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder="Add a detail…"
            className="w-full resize-none rounded-xl bg-zinc-900 px-3 py-2.5 text-base text-zinc-100 placeholder:text-zinc-500 outline-none ring-1 ring-zinc-800 focus:ring-cyan-500/50"
          />
        </div>

        <button
          type="button"
          onClick={submit}
          disabled={pending || !valid}
          className="mt-5 h-12 w-full rounded-xl text-sm font-bold text-zinc-950 transition disabled:opacity-40"
          style={{ background: valid ? token.color : "#3f3f46" }}
        >
          {pending ? "Saving…" : initial ? "Save changes" : "Add countdown"}
        </button>
        {initial && (
          <button
            type="button"
            onClick={del}
            disabled={pending}
            className="mt-1 h-11 w-full text-sm font-semibold text-rose-400 hover:text-rose-300"
          >
            Delete countdown
          </button>
        )}
      </div>
    </div>
  );
}

// ───────────────────────────── helpers ─────────────────────────────

function useNow(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

function deriveInitial(initial: ResolvedCountdown | null) {
  if (!initial) {
    return { title: "", date: todayInput(), time: "", category: "Personal", recurring: false, note: "", emoji: "" };
  }
  return {
    title: initial.title,
    date: initial.target_date,
    time: (initial.target_time ?? "").slice(0, 5),
    category: initial.category ?? "Personal",
    recurring: initial.recurring_yearly,
    note: initial.note ?? "",
    emoji: initial.emoji ?? "",
  };
}

function dateTimeLabel(item: ResolvedCountdown): string {
  const d = item.nextAt;
  const yr = d.getFullYear() !== new Date().getFullYear() ? ` ${d.getFullYear()}` : "";
  let label = `${DOW[d.getDay()]}, ${MON[d.getMonth()]} ${d.getDate()}${yr}`;
  if (item.target_time) {
    let h = d.getHours();
    const m = d.getMinutes();
    const ap = h >= 12 ? "PM" : "AM";
    h = h % 12 || 12;
    label += ` · ${h}:${String(m).padStart(2, "0")} ${ap}`;
  }
  if (item.recurring_yearly) label += " · Yearly";
  return label;
}

function todayInput(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
