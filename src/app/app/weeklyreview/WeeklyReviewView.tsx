"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import type { WeekStats } from "./page";
import { saveReview, deleteReview } from "./actions";
import {
  formatRange,
  formatMinutes,
  parseISODate,
  type WeeklyReview,
} from "./lib";

interface SectionDef {
  key: "wins" | "misses" | "lessons" | "next_focus";
  label: string;
  hint: string;
  accent: string;
}

const SECTIONS: SectionDef[] = [
  { key: "wins", label: "Wins", hint: "What went well? What are you proud of?", accent: "text-emerald-300" },
  { key: "misses", label: "Misses", hint: "What didn't go to plan? What got dropped?", accent: "text-rose-300" },
  { key: "lessons", label: "Lessons", hint: "What did you learn? What will you do differently?", accent: "text-amber-300" },
  { key: "next_focus", label: "Next-week focus", hint: "Your top priorities for the week ahead.", accent: "text-cyan-300" },
];

type Draft = Record<SectionDef["key"], string>;

function emptyDraft(): Draft {
  return { wins: "", misses: "", lessons: "", next_focus: "" };
}

function draftFromReview(r: WeeklyReview | null): Draft {
  if (!r) return emptyDraft();
  return { wins: r.wins, misses: r.misses, lessons: r.lessons, next_focus: r.next_focus };
}

export function WeeklyReviewView({
  weekStartISO,
  prevWeekISO,
  nextWeekISO,
  isCurrentWeek,
  review,
  prevReview,
  stats,
}: {
  weekStartISO: string;
  prevWeekISO: string;
  nextWeekISO: string | null;
  isCurrentWeek: boolean;
  review: WeeklyReview | null;
  prevReview: WeeklyReview | null;
  stats: WeekStats;
}) {
  const hasReview = review !== null;
  // Start in edit mode only when there's nothing written yet.
  const [editing, setEditing] = useState(!hasReview);
  const [draft, setDraft] = useState<Draft>(() => draftFromReview(review));
  const [pending, start] = useTransition();

  const dirty = useMemo(() => {
    const base = draftFromReview(review);
    return SECTIONS.some((s) => draft[s.key].trim() !== base[s.key].trim());
  }, [draft, review]);

  function save() {
    const anyContent = SECTIONS.some((s) => draft[s.key].trim());
    if (!anyContent) return;
    start(async () => {
      await saveReview(weekStartISO, {
        wins: draft.wins,
        misses: draft.misses,
        lessons: draft.lessons,
        next_focus: draft.next_focus,
      });
      setEditing(false);
    });
  }

  function remove() {
    if (!confirm("Delete this week's review?")) return;
    start(async () => {
      await deleteReview(weekStartISO);
      setDraft(emptyDraft());
      setEditing(true);
    });
  }

  return (
    <div className="space-y-5">
      <WeekNav
        weekStartISO={weekStartISO}
        prevWeekISO={prevWeekISO}
        nextWeekISO={nextWeekISO}
        isCurrentWeek={isCurrentWeek}
      />

      <StatsHeader stats={stats} />

      {/* P3 — carry forward last week's focus as a "did you do it?" prompt. */}
      {prevReview && prevReview.next_focus.trim() && (
        <CarryForward text={prevReview.next_focus} weekStartISO={prevWeekISO} />
      )}

      {editing ? (
        <div className="space-y-4">
          {SECTIONS.map((s) => (
            <div key={s.key} className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
              <label className={`block text-sm font-semibold ${s.accent}`}>{s.label}</label>
              <p className="mt-0.5 text-xs text-zinc-500">{s.hint}</p>
              <textarea
                value={draft[s.key]}
                onChange={(e) => setDraft((d) => ({ ...d, [s.key]: e.target.value }))}
                rows={4}
                placeholder="…"
                className="mt-2 w-full resize-y rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-base text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-cyan-500/60"
              />
            </div>
          ))}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={save}
              disabled={pending}
              className="min-h-[44px] flex-1 rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-cyan-400 disabled:opacity-50"
            >
              {hasReview ? "Save changes" : "Save review"}
            </button>
            {hasReview && (
              <button
                type="button"
                onClick={() => {
                  setDraft(draftFromReview(review));
                  setEditing(false);
                }}
                disabled={pending}
                className="min-h-[44px] rounded-lg border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-900 disabled:opacity-50"
              >
                Cancel
              </button>
            )}
          </div>
          {!dirty && hasReview && (
            <p className="text-center text-xs text-zinc-600">No unsaved changes.</p>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {SECTIONS.map((s) => {
            const text = (review?.[s.key] ?? "").trim();
            if (!text) return null;
            return (
              <div key={s.key} className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
                <h3 className={`text-sm font-semibold ${s.accent}`}>{s.label}</h3>
                <p className="mt-1 whitespace-pre-wrap break-words text-sm text-zinc-200">{text}</p>
              </div>
            );
          })}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="min-h-[44px] flex-1 rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-cyan-400"
            >
              Edit this week&apos;s review
            </button>
            <button
              type="button"
              onClick={remove}
              disabled={pending}
              aria-label="Delete review"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-zinc-800 text-zinc-500 hover:bg-zinc-900 hover:text-rose-400 disabled:opacity-50"
            >
              <span className="text-lg leading-none">×</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function WeekNav({
  weekStartISO,
  prevWeekISO,
  nextWeekISO,
  isCurrentWeek,
}: {
  weekStartISO: string;
  prevWeekISO: string;
  nextWeekISO: string | null;
  isCurrentWeek: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <Link
        href={`/app/weeklyreview?week=${prevWeekISO}`}
        aria-label="Previous week"
        className="flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-800 text-zinc-300 hover:bg-zinc-900"
      >
        ←
      </Link>
      <div className="text-center">
        <div className="text-sm font-semibold text-zinc-100">{formatRange(weekStartISO)}</div>
        <div className="text-[11px] uppercase tracking-wider text-zinc-500">
          {isCurrentWeek ? "This week" : `Week of ${parseISODate(weekStartISO).getFullYear()}`}
        </div>
      </div>
      {nextWeekISO ? (
        <Link
          href={`/app/weeklyreview?week=${nextWeekISO}`}
          aria-label="Next week"
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-800 text-zinc-300 hover:bg-zinc-900"
        >
          →
        </Link>
      ) : (
        <span
          aria-hidden
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-900 text-zinc-700"
        >
          →
        </span>
      )}
    </div>
  );
}

function StatsHeader({ stats }: { stats: WeekStats }) {
  const items = [
    { label: "Habits", value: String(stats.habitsCompleted) },
    { label: "Focus", value: formatMinutes(stats.focusMinutes) },
    { label: "Todos done", value: String(stats.todosDone) },
    { label: "Tracked", value: formatMinutes(stats.trackedMinutes) },
  ];
  return (
    <div>
      <div className="grid grid-cols-4 gap-2">
        {items.map((it) => (
          <div
            key={it.label}
            className="rounded-xl border border-zinc-800 bg-zinc-900/40 px-2 py-3 text-center"
          >
            <div className="text-base font-semibold tabular-nums text-zinc-100">{it.value}</div>
            <div className="mt-0.5 text-[10px] font-medium uppercase tracking-wider text-zinc-500">
              {it.label}
            </div>
          </div>
        ))}
      </div>
      <p className="mt-1.5 text-center text-[11px] text-zinc-600">
        What actually happened this week — pulled from your other apps.
      </p>
    </div>
  );
}

function CarryForward({ text, weekStartISO }: { text: string; weekStartISO: string }) {
  return (
    <div className="rounded-2xl border border-cyan-500/30 bg-cyan-500/5 p-4">
      <h3 className="text-sm font-semibold text-cyan-300">Last week you said you&apos;d focus on…</h3>
      <p className="mt-1 whitespace-pre-wrap break-words text-sm text-zinc-200">{text}</p>
      <p className="mt-2 text-xs text-zinc-500">
        Did you? Reflect on it in this week&apos;s Wins / Misses ({formatRange(weekStartISO)}).
      </p>
    </div>
  );
}
