"use client";

import { useRef, useState, useTransition } from "react";
import { addEventAction, deleteEventAction } from "./actions";

interface Event {
  id: number;
  title: string;
  description: string | null;
  start_date: string;
  start_time: string | null;
}

interface Props {
  upcoming: Event[];
  past: Event[];
}

export function CalendarView({ upcoming, past }: Props) {
  const [showForm, setShowForm] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, start] = useTransition();
  const [showPast, setShowPast] = useState(false);
  const today = new Date().toISOString().slice(0, 10);

  function submit(formData: FormData) {
    start(async () => {
      await addEventAction(formData);
      formRef.current?.reset();
      setShowForm(false);
    });
  }

  const grouped = groupByDate(upcoming);

  return (
    <div>
      {!showForm ? (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="flex h-11 w-full items-center justify-center rounded-xl bg-cyan-500 text-sm font-semibold text-zinc-950 hover:bg-cyan-400"
        >
          + New event
        </button>
      ) : (
        <form ref={formRef} action={submit} className="space-y-2 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-3">
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
              defaultValue={today}
              className="flex-1 rounded-lg bg-zinc-900 px-3 py-2 text-base text-zinc-100 outline-none ring-1 ring-zinc-800 focus:ring-cyan-500/50"
            />
            <input
              name="start_time"
              type="time"
              className="w-32 rounded-lg bg-zinc-900 px-3 py-2 text-base text-zinc-100 outline-none ring-1 ring-zinc-800 focus:ring-cyan-500/50"
            />
          </div>
          <textarea
            name="description"
            placeholder="Notes (optional)"
            rows={2}
            className="w-full resize-none rounded-lg bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none ring-1 ring-zinc-800 focus:ring-cyan-500/50"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
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

      <h3 className="mb-2 mt-6 text-xs font-semibold uppercase tracking-wider text-zinc-500">Upcoming</h3>
      {upcoming.length === 0 ? (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-8 text-center">
          <p className="text-sm text-zinc-400">No upcoming events.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {grouped.map(([date, events]) => (
            <DaySection key={date} date={date} events={events} />
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
              {groupByDate(past).map(([date, events]) => (
                <DaySection key={date} date={date} events={events} muted />
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
  const label = d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: d.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
  });
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
  const time = event.start_time
    ? new Date(`1970-01-01T${event.start_time}`).toLocaleTimeString(undefined, {
        hour: "numeric",
        minute: "2-digit",
      })
    : "All day";

  return (
    <li className={`flex items-start gap-3 rounded-xl border border-zinc-800 bg-zinc-900/40 px-3 py-3 ${pending ? "opacity-50" : ""}`}>
      <div className={`w-16 shrink-0 text-xs font-semibold ${muted ? "text-zinc-600" : "text-zinc-300"}`}>{time}</div>
      <div className="min-w-0 flex-1">
        <div className={`text-sm font-semibold ${muted ? "text-zinc-500" : "text-zinc-100"}`}>{event.title}</div>
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

function groupByDate(events: Event[]): [string, Event[]][] {
  const map = new Map<string, Event[]>();
  for (const e of events) {
    const arr = map.get(e.start_date) ?? [];
    arr.push(e);
    map.set(e.start_date, arr);
  }
  return Array.from(map.entries());
}
