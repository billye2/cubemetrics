"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { addEventAction, deleteEventAction } from "./actions";

export interface Event {
  id: number;
  title: string;
  description: string | null;
  start_date: string;
  start_time: string | null;
  end_date: string | null;
}

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

function fmtTime(t: string | null): string {
  if (!t) return "All day";
  return new Date(`1970-01-01T${t}`).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export function CalendarView({ events, today }: { events: Event[]; today: string }) {
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

  // date string -> events occurring that day (multi-day events span their range).
  const byDay = useMemo(() => {
    const map = new Map<string, Event[]>();
    for (const e of events) {
      const days = e.end_date && e.end_date > e.start_date ? eachDay(e.start_date, e.end_date) : [e.start_date];
      for (const day of days) {
        const arr = map.get(day) ?? [];
        arr.push(e);
        map.set(day, arr);
      }
    }
    return map;
  }, [events]);

  function submit(formData: FormData) {
    start(async () => {
      await addEventAction(formData);
      formRef.current?.reset();
      setFormDate(null);
    });
  }

  return (
    <div>
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
          <div className="flex gap-2">
            <input
              name="start_date"
              type="date"
              required
              defaultValue={formDate}
              className="flex-1 rounded-lg bg-zinc-900 px-3 py-2 text-base text-zinc-100 outline-none ring-1 ring-zinc-800 focus:ring-cyan-500/50"
            />
            <input
              name="start_time"
              type="time"
              className="w-32 rounded-lg bg-zinc-900 px-3 py-2 text-base text-zinc-100 outline-none ring-1 ring-zinc-800 focus:ring-cyan-500/50"
            />
          </div>
          <label className="block text-[11px] uppercase tracking-wider text-zinc-500">
            Ends (optional — for multi-day)
            <input
              name="end_date"
              type="date"
              className="mt-1 w-full rounded-lg bg-zinc-900 px-3 py-2 text-base text-zinc-100 outline-none ring-1 ring-zinc-800 focus:ring-cyan-500/50"
            />
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
        <Agenda events={events} today={today} />
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
  byDay: Map<string, Event[]>;
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

function SelectedDay({ date, events, onAdd }: { date: string; events: Event[]; onAdd: () => void }) {
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
            <EventRow key={e.id} event={e} />
          ))}
        </ul>
      )}
    </div>
  );
}

function Agenda({ events, today }: { events: Event[]; today: string }) {
  const [showPast, setShowPast] = useState(false);
  const upcoming = events.filter((e) => (e.end_date || e.start_date) >= today);
  const past = events.filter((e) => (e.end_date || e.start_date) < today).reverse();

  const groups = (list: Event[]): [string, Event[]][] => {
    const map = new Map<string, Event[]>();
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
            <DaySection key={date} date={date} events={evs} />
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

function DaySection({ date, events, muted = false }: { date: string; events: Event[]; muted?: boolean }) {
  const d = new Date(date + "T00:00:00");
  const label = d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  return (
    <div>
      <div className={`mb-2 text-sm font-semibold ${muted ? "text-zinc-500" : "text-cyan-400"}`}>{label}</div>
      <ul className="space-y-2">
        {events.map((e) => (
          <EventRow key={e.id} event={e} muted={muted} />
        ))}
      </ul>
    </div>
  );
}

function EventRow({ event, muted }: { event: Event; muted?: boolean }) {
  const [pending, start] = useTransition();
  function remove() {
    if (!confirm("Delete this event?")) return;
    start(() => deleteEventAction(event.id));
  }
  const multiDay = event.end_date && event.end_date > event.start_date;

  return (
    <li className={`flex items-start gap-3 rounded-xl border border-zinc-800 bg-zinc-900/40 px-3 py-3 ${pending ? "opacity-50" : ""}`}>
      <div className={`w-16 shrink-0 text-xs font-semibold ${muted ? "text-zinc-600" : "text-zinc-300"}`}>{fmtTime(event.start_time)}</div>
      <div className="min-w-0 flex-1">
        <div className={`text-sm font-semibold ${muted ? "text-zinc-500" : "text-zinc-100"}`}>{event.title}</div>
        {multiDay && (
          <div className="text-[11px] text-cyan-400">
            through {new Date(event.end_date! + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" })}
          </div>
        )}
        {event.description && (
          <div className="mt-0.5 whitespace-pre-wrap break-words text-xs text-zinc-400">{event.description}</div>
        )}
      </div>
      <button
        type="button"
        onClick={remove}
        className="rounded-lg p-1 text-zinc-600 hover:bg-zinc-800 hover:text-red-400"
      >
        ×
      </button>
    </li>
  );
}
