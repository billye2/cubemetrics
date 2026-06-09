"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import type { HabitWithStats } from "./page";
import { addHabit, checkInAction, deleteHabitAction, renameHabitAction } from "./actions";
import { buildHeatmap, completionRate } from "./lib";
import { InlineEdit } from "@/components/modern/InlineEdit";

export function HabitsView({ habits }: { habits: HabitWithStats[] }) {
  return (
    <div className="space-y-6">
      <TodayRow habits={habits} />
      <AddHabitForm />
      <HabitList habits={habits} />
    </div>
  );
}

function TodayRow({ habits }: { habits: HabitWithStats[] }) {
  if (habits.length === 0) return null;
  const done = habits.filter((h) => h.checkedToday).length;
  const pct = Math.round((done / habits.length) * 100);
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Today</h3>
        <span className="text-xs font-semibold tabular-nums text-zinc-400">
          {done}/{habits.length} done
        </span>
      </div>
      <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-zinc-800">
        <div
          className="h-full rounded-full bg-cyan-500 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex flex-wrap gap-3">
        {habits.map((h) => (
          <CheckInButton key={h.id} habit={h} />
        ))}
      </div>
    </div>
  );
}

function CheckInButton({ habit }: { habit: HabitWithStats }) {
  const [pending, start] = useTransition();
  function onClick() {
    // Toggling: a checked tile undoes today's check-in, an unchecked one checks in.
    start(() => checkInAction(habit.id));
  }
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      aria-pressed={habit.checkedToday}
      aria-label={
        habit.checkedToday
          ? `${habit.name} checked in for today — tap to undo`
          : `Check in ${habit.name}`
      }
      className={`group relative flex min-h-[88px] min-w-[88px] flex-col items-center justify-center gap-1 rounded-2xl border-2 px-3 py-2 text-center transition ${
        habit.checkedToday
          ? "border-cyan-500 bg-cyan-500/20 text-cyan-100"
          : "border-zinc-700 bg-zinc-900/60 text-zinc-200 hover:border-cyan-500/60 hover:bg-zinc-900"
      } ${pending ? "opacity-50" : ""}`}
    >
      <span
        className={`flex h-10 w-10 items-center justify-center rounded-full text-lg ${
          habit.checkedToday
            ? "bg-cyan-500 text-zinc-950"
            : "border-2 border-zinc-600 text-zinc-500 group-hover:border-cyan-400"
        }`}
      >
        {habit.checkedToday ? "✓" : ""}
      </span>
      <span className="line-clamp-2 max-w-[88px] text-xs font-medium">
        {habit.name}
      </span>
      {habit.streak > 0 && (
        <span className="absolute -right-1 -top-1 inline-flex min-h-[20px] min-w-[20px] items-center justify-center rounded-full bg-amber-500 px-1.5 text-[10px] font-bold text-zinc-950">
          {habit.streak}
        </span>
      )}
    </button>
  );
}

function AddHabitForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, start] = useTransition();

  function submit(formData: FormData) {
    const name = String(formData.get("name") || "").trim();
    if (!name) return;
    start(async () => {
      await addHabit(name);
      formRef.current?.reset();
    });
  }

  return (
    <form
      ref={formRef}
      action={submit}
      className="flex items-center gap-2 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-2"
    >
      <input
        name="name"
        autoComplete="off"
        placeholder="New habit…"
        className="flex-1 bg-transparent px-2 py-2 text-base text-zinc-100 placeholder:text-zinc-500 outline-none"
      />
      <button
        type="submit"
        disabled={pending}
        className="min-h-[44px] rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-cyan-400 disabled:opacity-50"
      >
        Add
      </button>
    </form>
  );
}

function HabitList({ habits }: { habits: HabitWithStats[] }) {
  if (habits.length === 0) {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-8 text-center">
        <div className="text-3xl text-zinc-600">⊙</div>
        <p className="mt-2 text-sm text-zinc-300">No habits yet.</p>
        <p className="text-xs text-zinc-500">Add one above to start tracking.</p>
      </div>
    );
  }
  return (
    <div>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
        All habits
      </h3>
      <ul className="space-y-2">
        {habits.map((h) => (
          <HabitRow key={h.id} habit={h} />
        ))}
      </ul>
    </div>
  );
}

function HabitRow({ habit }: { habit: HabitWithStats }) {
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  function remove() {
    if (!confirm("Delete this habit?")) return;
    start(() => deleteHabitAction(habit.id));
  }
  return (
    <li
      className={`rounded-xl border border-zinc-800 bg-zinc-900/40 px-3 py-3 ${
        pending ? "opacity-50" : ""
      }`}
    >
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <InlineEdit
            value={habit.name}
            ariaLabel="Rename habit"
            onSave={(next) => renameHabitAction(habit.id, next)}
          >
            <div className="break-words text-sm font-medium text-zinc-100">
              {habit.name}
            </div>
          </InlineEdit>
          <div className="mt-1 flex flex-wrap gap-3 text-xs text-zinc-400">
            <span className="inline-flex items-center gap-1">
              <span className="text-amber-400">⚡</span>
              {habit.streak} day streak
            </span>
            <span>{habit.weekCount}/7 this week</span>
            <span>{completionRate(new Set(habit.checkinDates), 30)}% · 30d</span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-label={open ? "Hide history" : "Show history"}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-800 hover:text-cyan-400"
        >
          <span className="text-sm leading-none">{open ? "▴" : "▾"}</span>
        </button>
        <button
          type="button"
          onClick={remove}
          aria-label="Delete habit"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-800 hover:text-red-400"
        >
          <span className="text-lg leading-none">×</span>
        </button>
      </div>
      {open && <Heatmap dates={habit.checkinDates} />}
    </li>
  );
}

const WEEKDAY_LABELS = ["", "M", "", "W", "", "F", ""];

function Heatmap({ dates }: { dates: string[] }) {
  const columns = useMemo(() => buildHeatmap(new Set(dates), 8), [dates]);
  return (
    <div className="mt-3 border-t border-zinc-800 pt-3">
      <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-600">
        Last 8 weeks
      </div>
      <div className="flex gap-[3px]">
        {/* weekday labels */}
        <div className="mr-1 flex flex-col gap-[3px]">
          {WEEKDAY_LABELS.map((l, i) => (
            <span
              key={i}
              className="flex h-[14px] w-3 items-center text-[8px] leading-none text-zinc-600"
            >
              {l}
            </span>
          ))}
        </div>
        {columns.map((col, ci) => (
          <div key={ci} className="flex flex-col gap-[3px]">
            {col.map((cell) => (
              <span
                key={cell.date}
                title={`${cell.date}${cell.checked ? " — done" : ""}`}
                aria-label={`${cell.date}${cell.checked ? " done" : ""}`}
                className={`h-[14px] w-[14px] rounded-[3px] ${
                  cell.filler
                    ? "bg-transparent"
                    : cell.checked
                      ? "bg-cyan-500"
                      : "bg-zinc-800"
                }`}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
