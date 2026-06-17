"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { addEventAction, updateEventAction, deleteEventAction } from "./actions";
import { expandEvents, RECURRENCE_LABEL, type Event, type Occurrence } from "./lib";
import { Ring, StatStrip, StatTile } from "../_factories/FactoryUI";

export type { Event } from "./lib";

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

function ymd(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function eachDay(start: string, end: string): string[] {
  const out: string[] = [];
  const d = new Date(start + "T00:00:00");
  const last = new Date(end + "T00:00:00");
  let guard = 0;
  while (d <= last && guard < 400) {
    out.push(ymd(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setDate(d.getDate() + 1);
    guard++;
  }
  return out;
}

function fmtTime(t: string): string {
  return new Date(`1970-01-01T${t}`).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

/** "All day" / "2:00 PM" / "2:00 – 3:30 PM" from start/end times. */
function timeRange(start: string | null, end: string | null): string {
  if (!start) return "All day";
  if (end && end > start) return `${fmtTime(start)} – ${fmtTime(end)}`;
  return fmtTime(start);
}

interface MonthStats {
  monthLabel: string;
  /** 0..1 — how far through the visible month "today" is (clamped, 1 if month is fully past). */
  progress: number;
  /** true when the visible month is the one that contains `today`. */
  isCurrentMonth: boolean;
  dayOfMonth: number;
  daysInMonth: number;
  /** distinct events (by series id) with an occurrence in the visible month. */
  thisMonth: number;
  /** events happening today. */
  today: number;
  /** events on or after today, across the loaded window. */
  upcoming: number;
}

function monthStats(
  occurrences: Occurrence[],
  byDay: Map<string, Occurrence[]>,
  cursor: { y: number; m: number },
  todayStr: string,
): MonthStats {
  const { y, m } = cursor;
  const monthLabel = new Date(y, m, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const monthPrefix = `${y}-${String(m + 1).padStart(2, "0")}-`;

  const t = new Date(todayStr + "T00:00:00");
  const isCurrentMonth = t.getFullYear() === y && t.getMonth() === m;
  const isPastMonth = y < t.getFullYear() || (y === t.getFullYear() && m < t.getMonth());
  const dayOfMonth = isCurrentMonth ? t.getDate() : daysInMonth;
  const progress = isCurrentMonth ? dayOfMonth / daysInMonth : isPastMonth ? 1 : 0;

  // Distinct events with at least one occurrence whose start lands in the visible month.
  const monthIds = new Set<number>();
  for (const e of occurrences) {
    if (e.start_date.startsWith(monthPrefix)) monthIds.add(e.id);
  }

  const todayCount = (byDay.get(todayStr) ?? []).length;
  const upcoming = occurrences.filter((e) => (e.end_date || e.start_date) >= todayStr).length;

  return {
    monthLabel,
    progress,
    isCurrentMonth,
    dayOfMonth,
    daysInMonth,
    thisMonth: monthIds.size,
    today: todayCount,
    upcoming,
  };
}

function Hero({ stats }: { stats: MonthStats }) {
  const pctLabel = Math.round(stats.progress * 100);
  return (
    <div className="mb-4 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
      <div className="flex items-center gap-4">
        <Ring pct={stats.progress} size={72} stroke={8} tone="cyan">
          <span className="text-lg font-bold tabular-nums text-cyan-300">{stats.dayOfMonth}</span>
          <span className="text-[10px] uppercase tracking-wider text-zinc-500">
            of {stats.daysInMonth}
          </span>
        </Ring>
        <div className="min-w-0 flex-1">
          <div className="text-xs font-medium uppercase tracking-wider text-zinc-500">{stats.monthLabel}</div>
          <p className="mt-0.5 text-sm text-zinc-300">
            {stats.isCurrentMonth
              ? `${pctLabel}% through the month · ${stats.thisMonth} event${stats.thisMonth === 1 ? "" : "s"} scheduled`
              : `${stats.thisMonth} event${stats.thisMonth === 1 ? "" : "s"} this month`}
          </p>
        </div>
      </div>

      <StatStrip cols={3}>
        <StatTile label="This month" value={String(stats.thisMonth)} tone="cyan" />
        <StatTile label="Today" value={String(stats.today)} tone={stats.today > 0 ? "amber" : "zinc"} />
        <StatTile label="Upcoming" value={String(stats.upcoming)} tone={stats.upcoming > 0 ? "emerald" : "zinc"} />
      </StatStrip>
    </div>
  );
}

export function CalendarView({
  events,
  today,
  windowStart,
  windowEnd,
}: {
  events: Event[];
  today: string;
  windowStart: string;
  windowEnd: string;
}) {
  const [mode, setMode] = useState<"month" | "agenda">("month");
  const [ty, tm] = useMemo(() => {
    const d = new Date(today + "T00:00:00");
    return [d.getFullYear(), d.getMonth()] as const;
  }, [today]);
  const [cursor, setCursor] = useState({ y: ty, m: tm });
  const [selected, setSelected] = useState<string | null>(today);
  const [formDate, setFormDate] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, start] = useTransition();

  // Recurring series expand into concrete occurrences across the visible window.
  const occurrences = useMemo(
    () => expandEvents(events, windowStart, windowEnd),
    [events, windowStart, windowEnd],
  );

  // date string -> occurrences on that day (multi-day spans cover their range).
  const byDay = useMemo(() => {
    const map = new Map<string, Occurrence[]>();
    for (const e of occurrences) {
      const days = e.end_date && e.end_date > e.start_date ? eachDay(e.start_date, e.end_date) : [e.start_date];
      for (const day of days) {
        const arr = map.get(day) ?? [];
        arr.push(e);
        map.set(day, arr);
      }
    }
    return map;
  }, [occurrences]);

  // Month-progress + event-count stats for the hero, derived from already-computed data.
  const stats = useMemo(() => monthStats(occurrences, byDay, cursor, today), [occurrences, byDay, cursor, today]);

  function submit(formData: FormData) {
    start(async () => {
      await addEventAction(formData);
      formRef.current?.reset();
      setFormDate(null);
    });
  }

  return (
    <div>
      <Hero stats={stats} />

      <div className="mb-4 flex gap-1.5">
        <ModeButton active={mode === "month"} onClick={() => setMode("month")}>Month</ModeButton>
        <ModeButton active={mode === "agenda"} onClick={() => setMode("agenda")}>Agenda</ModeButton>
        <button
          type="button"
          onClick={() => {
            setFormDate(selected || today);
            setTimeout(() => formRef.current?.querySelector("input")?.focus(), 0);
          }}
          className="ml-auto rounded-full bg-cyan-500 px-4 py-1.5 text-xs font-semibold text-zinc-950 hover:bg-cyan-400"
        >
          + Event
        </button>
      </div>

      {formDate !== null && (
        <form ref={formRef} action={submit} className="mb-4 space-y-2 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-3">
          <input
            name="title"
            required
            autoFocus
            autoComplete="off"
            placeholder="Title"
            className="w-full rounded-lg bg-zinc-900 px-3 py-2 text-base text-zinc-100 placeholder:text-zinc-500 outline-none ring-1 ring-zinc-800 focus:ring-cyan-500/50"
          />
          <input
            name="start_date"
            type="date"
            required
            defaultValue={formDate}
            className="w-full rounded-lg bg-zinc-900 px-3 py-2 text-base text-zinc-100 outline-none ring-1 ring-zinc-800 focus:ring-cyan-500/50"
          />
          <div className="flex items-center gap-2">
            <input
              name="start_time"
              type="time"
              aria-label="Start time"
              className="flex-1 rounded-lg bg-zinc-900 px-3 py-2 text-base text-zinc-100 outline-none ring-1 ring-zinc-800 focus:ring-cyan-500/50"
            />
            <span className="text-xs text-zinc-500">to</span>
            <input
              name="end_time"
              type="time"
              aria-label="End time"
              className="flex-1 rounded-lg bg-zinc-900 px-3 py-2 text-base text-zinc-100 outline-none ring-1 ring-zinc-800 focus:ring-cyan-500/50"
            />
          </div>
          <label className="block text-[11px] uppercase tracking-wider text-zinc-500">
            Ends on (optional — multi-day)
            <input
              name="end_date"
              type="date"
              className="mt-1 w-full rounded-lg bg-zinc-900 px-3 py-2 text-base text-zinc-100 outline-none ring-1 ring-zinc-800 focus:ring-cyan-500/50"
            />
          </label>
          <label className="block text-[11px] uppercase tracking-wider text-zinc-500">
            Repeats
            <RecurrenceSelect />
          </label>
          <textarea
            name="description"
            placeholder="Notes (optional)"
            rows={2}
            className="w-full resize-none rounded-lg bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none ring-1 ring-zinc-800 focus:ring-cyan-500/50"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setFormDate(null)}
              className="flex-1 rounded-lg bg-zinc-800 px-3 py-2 text-sm font-semibold text-zinc-300 hover:bg-zinc-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending}
              className="flex-1 rounded-lg bg-cyan-500 px-3 py-2 text-sm font-semibold text-zinc-950 hover:bg-cyan-400 disabled:opacity-50"
            >
              {pending ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      )}

      {mode === "month" ? (
        <MonthGrid
          cursor={cursor}
          setCursor={setCursor}
          today={today}
          byDay={byDay}
          selected={selected}
          onSelect={setSelected}
          onJumpToday={() => {
            setCursor({ y: ty, m: tm });
            setSelected(today);
          }}
        />
      ) : (
        <Agenda events={occurrences} today={today} />
      )}

      {mode === "month" && selected && (
        <SelectedDay
          date={selected}
          events={byDay.get(selected) ?? []}
          onAdd={() => {
            setFormDate(selected);
            setTimeout(() => formRef.current?.querySelector("input")?.focus(), 0);
          }}
        />
      )}
    </div>
  );
}

function RecurrenceSelect({ defaultValue = "" }: { defaultValue?: string }) {
  return (
    <select
      name="recurrence"
      defaultValue={defaultValue}
      className="mt-1 w-full appearance-none rounded-lg bg-zinc-900 px-3 py-2 text-base text-zinc-100 outline-none ring-1 ring-zinc-800 focus:ring-cyan-500/50"
    >
      <option value="">Doesn’t repeat</option>
      <option value="daily">Daily</option>
      <option value="weekly">Weekly</option>
      <option value="monthly">Monthly</option>
    </select>
  );
}

function ModeButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
        active ? "bg-cyan-500/15 text-cyan-300 ring-1 ring-cyan-500/30" : "text-zinc-500 hover:text-zinc-300"
      }`}
    >
      {children}
    </button>
  );
}

function MonthGrid({
  cursor,
  setCursor,
  today,
  byDay,
  selected,
  onSelect,
  onJumpToday,
}: {
  cursor: { y: number; m: number };
  setCursor: (c: { y: number; m: number }) => void;
  today: string;
  byDay: Map<string, Occurrence[]>;
  selected: string | null;
  onSelect: (d: string) => void;
  onJumpToday: () => void;
}) {
  const { y, m } = cursor;
  const monthLabel = new Date(y, m, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const firstWeekday = new Date(y, m, 1).getDay();
  const daysInMonth = new Date(y, m + 1, 0).getDate();

  const cells: { date: string; inMonth: boolean; day: number }[] = [];
  // Leading days from previous month.
  const prevDays = new Date(y, m, 0).getDate();
  for (let i = firstWeekday - 1; i >= 0; i--) {
    const day = prevDays - i;
    const pm = m === 0 ? 11 : m - 1;
    const py = m === 0 ? y - 1 : y;
    cells.push({ date: ymd(py, pm, day), inMonth: false, day });
  }
  for (let d = 1; d <= daysInMonth; d++) cells.push({ date: ymd(y, m, d), inMonth: true, day: d });
  while (cells.length % 7 !== 0 || cells.length < 42) {
    const idx = cells.length - (firstWeekday + daysInMonth) + 1;
    const nm = m === 11 ? 0 : m + 1;
    const ny = m === 11 ? y + 1 : y;
    cells.push({ date: ymd(ny, nm, idx), inMonth: false, day: idx });
    if (cells.length >= 42) break;
  }

  function shift(delta: number) {
    const nm = m + delta;
    const ny = y + Math.floor(nm / 12);
    setCursor({ y: ny, m: ((nm % 12) + 12) % 12 });
  }

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-3">
      <div className="mb-3 flex items-center justify-between">
        <button type="button" onClick={() => shift(-1)} className="rounded-lg px-3 py-1 text-zinc-400 hover:bg-zinc-800" aria-label="Previous month">‹</button>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-zinc-100">{monthLabel}</span>
          <button type="button" onClick={onJumpToday} className="rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] font-semibold text-zinc-300 hover:bg-zinc-700">Today</button>
        </div>
        <button type="button" onClick={() => shift(1)} className="rounded-lg px-3 py-1 text-zinc-400 hover:bg-zinc-800" aria-label="Next month">›</button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center">
        {WEEKDAYS.map((w, i) => (
          <div key={i} className="text-[10px] font-semibold uppercase text-zinc-600">{w}</div>
        ))}
        {cells.map((c) => {
          const dayEvents = byDay.get(c.date) ?? [];
          const isToday = c.date === today;
          const isSelected = c.date === selected;
          return (
            <button
              key={c.date}
              type="button"
              onClick={() => onSelect(c.date)}
              className={`flex aspect-square flex-col items-center justify-start rounded-lg p-1 text-xs transition ${
                isSelected ? "bg-cyan-500/15 ring-1 ring-cyan-500/40" : "hover:bg-zinc-800/60"
              } ${c.inMonth ? "text-zinc-200" : "text-zinc-600"}`}
            >
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full ${
                  isToday ? "bg-cyan-500 font-bold text-zinc-950" : ""
                }`}
              >
                {c.day}
              </span>
              {dayEvents.length > 0 && (
                <span className="mt-0.5 flex gap-0.5">
                  {dayEvents.slice(0, 3).map((_, i) => (
                    <span key={i} className={`h-1 w-1 rounded-full ${c.inMonth ? "bg-cyan-400" : "bg-zinc-600"}`} />
                  ))}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SelectedDay({ date, events, onAdd }: { date: string; events: Occurrence[]; onAdd: () => void }) {
  const label = new Date(date + "T00:00:00").toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  // Time-ordered: all-day first, then by start_time.
  const sorted = [...events].sort((a, b) => (a.start_time || "").localeCompare(b.start_time || ""));
  return (
    <div className="mt-4">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-cyan-400">{label}</h3>
        <button type="button" onClick={onAdd} className="text-xs font-semibold text-zinc-400 hover:text-zinc-200">+ Add</button>
      </div>
      {sorted.length === 0 ? (
        <p className="rounded-xl border border-zinc-800 bg-zinc-900/40 px-3 py-4 text-center text-sm text-zinc-500">Nothing scheduled.</p>
      ) : (
        <ul className="space-y-2">
          {sorted.map((e) => (
            <EventRow key={e.occKey} event={e} />
          ))}
        </ul>
      )}
    </div>
  );
}

function Agenda({ events, today }: { events: Occurrence[]; today: string }) {
  const [showPast, setShowPast] = useState(false);
  const upcoming = events.filter((e) => (e.end_date || e.start_date) >= today);
  const past = events.filter((e) => (e.end_date || e.start_date) < today).reverse();

  const groups = (list: Occurrence[]): [string, Occurrence[]][] => {
    const map = new Map<string, Occurrence[]>();
    for (const e of list) {
      const arr = map.get(e.start_date) ?? [];
      arr.push(e);
      map.set(e.start_date, arr);
    }
    return [...map.entries()];
  };

  return (
    <div>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">Upcoming</h3>
      {upcoming.length === 0 ? (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-8 text-center">
          <p className="text-sm text-zinc-400">No upcoming events.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {groups(upcoming).map(([date, evs]) => (
            <DaySection key={date} date={date} events={evs} isToday={date === today} />
          ))}
        </div>
      )}

      {past.length > 0 && (
        <div className="mt-8">
          <button
            type="button"
            onClick={() => setShowPast((v) => !v)}
            className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-500 hover:text-zinc-300"
          >
            <span>{showPast ? "▼" : "▶"}</span>
            Past ({past.length})
          </button>
          {showPast && (
            <div className="mt-3 space-y-4">
              {groups(past).map(([date, evs]) => (
                <DaySection key={date} date={date} events={evs} muted />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DaySection({
  date,
  events,
  muted = false,
  isToday = false,
}: {
  date: string;
  events: Occurrence[];
  muted?: boolean;
  isToday?: boolean;
}) {
  const d = new Date(date + "T00:00:00");
  const label = d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  return (
    <div>
      <div className={`mb-2 flex items-center gap-2 text-sm font-semibold ${muted ? "text-zinc-500" : "text-cyan-400"}`}>
        <span>{label}</span>
        {isToday && (
          <span className="rounded-full bg-cyan-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-cyan-300">Today</span>
        )}
      </div>
      <ul className="space-y-2">
        {events.map((e) => (
          <EventRow key={e.occKey} event={e} muted={muted} />
        ))}
      </ul>
    </div>
  );
}

function EventRow({ event, muted }: { event: Occurrence; muted?: boolean }) {
  const [pending, start] = useTransition();
  const [editing, setEditing] = useState(false);

  function remove() {
    const msg = event.repeats
      ? "Delete this repeating event and all of its occurrences?"
      : "Delete this event?";
    if (!confirm(msg)) return;
    start(() => deleteEventAction(event.id));
  }

  function submitEdit(formData: FormData) {
    start(async () => {
      await updateEventAction(event.id, formData);
      setEditing(false);
    });
  }

  const multiDay = event.end_date && event.end_date > event.start_date;

  if (editing) {
    return (
      <li className="rounded-xl border border-cyan-500/30 bg-zinc-900/40 p-3">
        <form action={submitEdit} className="space-y-2">
          {event.repeats && (
            <p className="text-[11px] text-zinc-500">Editing applies to the whole repeating series.</p>
          )}
          <input
            name="title"
            required
            defaultValue={event.title}
            autoComplete="off"
            className="w-full rounded-lg bg-zinc-900 px-3 py-2 text-base text-zinc-100 outline-none ring-1 ring-zinc-800 focus:ring-cyan-500/50"
          />
          <input
            name="start_date"
            type="date"
            required
            defaultValue={event.seriesStart}
            className="w-full rounded-lg bg-zinc-900 px-3 py-2 text-base text-zinc-100 outline-none ring-1 ring-zinc-800 focus:ring-cyan-500/50"
          />
          <div className="flex items-center gap-2">
            <input
              name="start_time"
              type="time"
              aria-label="Start time"
              defaultValue={event.start_time ?? ""}
              className="flex-1 rounded-lg bg-zinc-900 px-3 py-2 text-base text-zinc-100 outline-none ring-1 ring-zinc-800 focus:ring-cyan-500/50"
            />
            <span className="text-xs text-zinc-500">to</span>
            <input
              name="end_time"
              type="time"
              aria-label="End time"
              defaultValue={event.end_time ?? ""}
              className="flex-1 rounded-lg bg-zinc-900 px-3 py-2 text-base text-zinc-100 outline-none ring-1 ring-zinc-800 focus:ring-cyan-500/50"
            />
          </div>
          <input
            name="end_date"
            type="date"
            aria-label="End date"
            defaultValue={event.seriesEnd ?? ""}
            className="w-full rounded-lg bg-zinc-900 px-3 py-2 text-base text-zinc-100 outline-none ring-1 ring-zinc-800 focus:ring-cyan-500/50"
          />
          <label className="block text-[11px] uppercase tracking-wider text-zinc-500">
            Repeats
            <RecurrenceSelect defaultValue={event.recurrence ?? ""} />
          </label>
          <textarea
            name="description"
            rows={2}
            defaultValue={event.description ?? ""}
            className="w-full resize-none rounded-lg bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none ring-1 ring-zinc-800 focus:ring-cyan-500/50"
          />
          <div className="flex gap-2">
            <button type="button" onClick={() => setEditing(false)} className="flex-1 rounded-lg bg-zinc-800 px-3 py-2 text-sm font-semibold text-zinc-300 hover:bg-zinc-700">
              Cancel
            </button>
            <button type="submit" disabled={pending} className="flex-1 rounded-lg bg-cyan-500 px-3 py-2 text-sm font-semibold text-zinc-950 hover:bg-cyan-400 disabled:opacity-50">
              Save
            </button>
          </div>
        </form>
      </li>
    );
  }

  return (
    <li className={`flex items-start gap-3 rounded-xl border border-zinc-800 bg-zinc-900/40 px-3 py-3 ${pending ? "opacity-50" : ""}`}>
      <div className={`w-20 shrink-0 text-xs font-semibold ${muted ? "text-zinc-600" : "text-zinc-300"}`}>{timeRange(event.start_time, event.end_time)}</div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className={`text-sm font-semibold ${muted ? "text-zinc-500" : "text-zinc-100"}`}>{event.title}</span>
          {event.repeats && event.recurrence && (
            <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${muted ? "bg-zinc-800 text-zinc-500" : "bg-zinc-800 text-cyan-300"}`} title={`Repeats ${RECURRENCE_LABEL[event.recurrence as keyof typeof RECURRENCE_LABEL]?.toLowerCase()}`}>
              ↻ {RECURRENCE_LABEL[event.recurrence as keyof typeof RECURRENCE_LABEL]}
            </span>
          )}
        </div>
        {multiDay && (
          <div className="text-[11px] text-cyan-400">
            through {new Date(event.end_date! + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" })}
          </div>
        )}
        {event.description && (
          <div className="mt-0.5 whitespace-pre-wrap break-words text-xs text-zinc-400">{event.description}</div>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <button type="button" onClick={() => setEditing(true)} className="rounded-lg px-2 py-1 text-xs font-medium text-zinc-500 hover:bg-zinc-800 hover:text-cyan-300">
          Edit
        </button>
        <button type="button" onClick={remove} className="rounded-lg p-1 text-zinc-600 hover:bg-zinc-800 hover:text-red-400">
          ×
        </button>
      </div>
    </li>
  );
}
