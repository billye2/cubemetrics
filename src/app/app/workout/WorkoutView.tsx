"use client";

import { useRef, useState, useTransition } from "react";
import {
  addSessionAction,
  deleteSessionAction,
  addSetAction,
  deleteSetAction,
} from "./actions";
import { StatTile, StatStrip } from "../_factories/FactoryUI";
import { entryStreak } from "../_factories/factoryLib";

export interface WorkoutSet {
  id: number;
  session_id: number;
  exercise: string;
  reps: number | null;
  weight: number | null;
  rpe: number | null;
  created_at: string;
}

export interface SessionWithSets {
  id: number;
  title: string;
  performed_on: string;
  note: string | null;
  created_at: string;
  sets: WorkoutSet[];
}

export interface WorkoutStats {
  weekSessions: number;
  weekVolume: number;
  totalSessions: number;
}

const VOLUME_FMT = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 });

function setVolume(s: WorkoutSet): number {
  if (s.reps == null || s.weight == null) return 0;
  return Number(s.reps) * Number(s.weight);
}

export function WorkoutView({
  sessions,
  prByExercise,
  stats,
}: {
  sessions: SessionWithSets[];
  prByExercise: Record<string, number>;
  stats: WorkoutStats;
}) {
  const [showForm, setShowForm] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, start] = useTransition();

  // Consecutive days with a workout (anchored to local noon to avoid tz drift).
  const streak = entryStreak(sessions.map((s) => `${s.performed_on}T12:00:00`));

  function submit(formData: FormData) {
    const title = String(formData.get("title") || "").trim();
    if (!title) return;
    const performedOn = String(formData.get("performed_on") || "");
    const note = String(formData.get("note") || "");
    start(async () => {
      await addSessionAction(title, performedOn, note);
      formRef.current?.reset();
      setShowForm(false);
    });
  }

  return (
    <div>
      <StatStrip cols={3}>
        <StatTile label="Workouts" sub="7d" value={String(stats.weekSessions)} />
        <StatTile label="Volume" sub="7d" value={VOLUME_FMT.format(stats.weekVolume)} />
        <StatTile
          label="Streak"
          value={streak > 0 ? String(streak) : "—"}
          sub={streak > 0 ? (streak === 1 ? "day" : "days") : "start one"}
          tone={streak > 0 ? "amber" : "zinc"}
        />
      </StatStrip>

      {!showForm ? (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="flex h-11 w-full items-center justify-center rounded-xl bg-cyan-500 text-sm font-semibold text-zinc-950 hover:bg-cyan-400"
        >
          + New workout
        </button>
      ) : (
        <form ref={formRef} action={submit} className="space-y-2 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-3">
          <input
            name="title"
            autoComplete="off"
            autoFocus
            placeholder="Workout name (e.g. Push day, Legs)"
            className="w-full rounded-lg bg-zinc-900 px-3 py-2 text-base text-zinc-100 placeholder:text-zinc-500 outline-none ring-1 ring-zinc-800 focus:ring-cyan-500/50"
          />
          <input
            name="performed_on"
            type="date"
            className="w-full rounded-lg bg-zinc-900 px-3 py-2 text-base text-zinc-100 outline-none ring-1 ring-zinc-800 focus:ring-cyan-500/50"
          />
          <input
            name="note"
            autoComplete="off"
            placeholder="Note (optional)"
            className="w-full rounded-lg bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none ring-1 ring-zinc-800 focus:ring-cyan-500/50"
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
              {pending ? "Saving…" : "Start workout"}
            </button>
          </div>
        </form>
      )}

      {sessions.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-8 text-center">
          <p className="text-sm text-zinc-400">No workouts logged yet.</p>
          <p className="mt-1 text-xs text-zinc-500">Start one above, then add your exercises and sets.</p>
        </div>
      ) : (
        <ul className="mt-4 space-y-3">
          {sessions.map((s) => (
            <SessionCard key={s.id} session={s} prByExercise={prByExercise} />
          ))}
        </ul>
      )}
    </div>
  );
}

function SessionCard({
  session,
  prByExercise,
}: {
  session: SessionWithSets;
  prByExercise: Record<string, number>;
}) {
  const [pending, start] = useTransition();
  const [adding, setAdding] = useState(false);
  const exRef = useRef<HTMLInputElement>(null);
  const repsRef = useRef<HTMLInputElement>(null);
  const weightRef = useRef<HTMLInputElement>(null);
  const rpeRef = useRef<HTMLInputElement>(null);

  const date = new Date(session.performed_on + "T12:00:00").toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const volume = session.sets.reduce((acc, s) => acc + setVolume(s), 0);

  // Group sets by exercise in insertion order.
  const groups: { exercise: string; sets: WorkoutSet[] }[] = [];
  for (const s of session.sets) {
    const last = groups[groups.length - 1];
    if (last && last.exercise.toLowerCase() === s.exercise.toLowerCase()) last.sets.push(s);
    else groups.push({ exercise: s.exercise, sets: [s] });
  }

  function addSet() {
    const exercise = exRef.current?.value.trim() || "";
    if (!exercise) return;
    const reps = repsRef.current?.value ? Number(repsRef.current.value) : null;
    const weight = weightRef.current?.value ? Number(weightRef.current.value) : null;
    const rpe = rpeRef.current?.value ? Number(rpeRef.current.value) : null;
    start(async () => {
      await addSetAction(session.id, exercise, reps, weight, rpe);
      // Keep exercise + reps/weight/rpe so the next set of the same lift is one tap
      // (prior-set prefill — the common case when working through sets).
      exRef.current?.focus();
    });
  }

  function removeSession() {
    if (!confirm("Delete this workout and all its sets?")) return;
    start(() => deleteSessionAction(session.id));
  }

  return (
    <li className={`rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 ${pending ? "opacity-50" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold text-zinc-100">{session.title}</h3>
          <div className="text-xs text-zinc-500">
            {date}
            {volume > 0 && <span> · {VOLUME_FMT.format(volume)} volume</span>}
          </div>
        </div>
        <button type="button" onClick={removeSession} className="rounded-lg p-1 text-zinc-600 hover:bg-zinc-800 hover:text-red-400">×</button>
      </div>

      {session.note && <p className="mt-1 text-sm text-zinc-400">{session.note}</p>}

      {groups.length > 0 && (
        <ul className="mt-3 space-y-2">
          {groups.map((g, gi) => {
            const pr = prByExercise[g.exercise.toLowerCase()];
            return (
              <li key={gi} className="rounded-xl bg-zinc-900/60 px-3 py-2">
                <div className="mb-1 text-sm font-medium text-zinc-200">{g.exercise}</div>
                <div className="flex flex-wrap gap-1.5">
                  {g.sets.map((s) => {
                    const isPr = s.weight != null && pr != null && Number(s.weight) >= pr;
                    return (
                      <span
                        key={s.id}
                        className={`group inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs ${
                          isPr ? "bg-amber-500/15 text-amber-200 ring-1 ring-amber-500/30" : "bg-zinc-800 text-zinc-300"
                        }`}
                      >
                        {isPr && <span title="Personal record">★</span>}
                        {s.reps ?? "–"}
                        {s.weight != null && <span className="text-zinc-500">×{Number(s.weight)}</span>}
                        {s.rpe != null && <span className="text-zinc-600" title="RPE">@{s.rpe}</span>}
                        <button
                          type="button"
                          onClick={() => start(() => deleteSetAction(s.id))}
                          className="ml-0.5 text-zinc-600 hover:text-red-400"
                          aria-label="Delete set"
                        >
                          ×
                        </button>
                      </span>
                    );
                  })}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {adding ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input
            ref={exRef}
            autoComplete="off"
            autoFocus
            placeholder="Exercise"
            className="min-w-[8rem] flex-1 rounded-lg bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none ring-1 ring-zinc-800 focus:ring-cyan-500/50"
          />
          <input
            ref={repsRef}
            type="number"
            inputMode="numeric"
            placeholder="reps"
            className="w-16 rounded-lg bg-zinc-900 px-2 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none ring-1 ring-zinc-800 focus:ring-cyan-500/50"
          />
          <input
            ref={weightRef}
            type="number"
            inputMode="decimal"
            step="any"
            placeholder="wt"
            className="w-16 rounded-lg bg-zinc-900 px-2 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none ring-1 ring-zinc-800 focus:ring-cyan-500/50"
          />
          <input
            ref={rpeRef}
            type="number"
            inputMode="numeric"
            min={1}
            max={10}
            placeholder="rpe"
            title="Rate of perceived exertion (1–10)"
            className="w-14 rounded-lg bg-zinc-900 px-2 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none ring-1 ring-zinc-800 focus:ring-cyan-500/50"
          />
          <button
            type="button"
            onClick={addSet}
            className="rounded-lg bg-cyan-500 px-3 py-2 text-xs font-semibold text-zinc-950 hover:bg-cyan-400"
          >
            Add set
          </button>
          <button
            type="button"
            onClick={() => setAdding(false)}
            className="rounded-lg px-2 py-2 text-xs font-semibold text-zinc-400 hover:text-zinc-200"
          >
            Done
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="mt-3 rounded-lg bg-zinc-800 px-3 py-1.5 text-xs font-semibold text-zinc-200 hover:bg-zinc-700"
        >
          + Add set
        </button>
      )}
    </li>
  );
}
