"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import {
  fmt,
  isOver,
  monthLabel,
  pace,
  totalsOf,
  type BudgetLine,
  type CategoryRow,
  type Totals,
} from "./lib";
import { copyForwardAction, setBudgetTargetAction } from "./actions";
import { Ring, StatusPill } from "../_factories/FactoryUI";

export function BudgetView({
  month,
  prevMonth,
  nextMonth,
  isCurrentMonth,
  categories,
  lines,
  canCopyForward,
  prevPlannedCount,
}: {
  month: string;
  prevMonth: string;
  nextMonth: string;
  isCurrentMonth: boolean;
  categories: CategoryRow[];
  lines: BudgetLine[];
  canCopyForward: boolean;
  prevPlannedCount: number;
}) {
  const totals = useMemo(() => totalsOf(lines), [lines]);

  const overall = totals.spent > totals.planned && totals.planned > 0;
  const anyPlanned = totals.planned > 0;
  const pacing = useMemo(
    () => pace(totals, isCurrentMonth),
    [totals, isCurrentMonth],
  );

  // Show budgeted categories first (highest planned), then the rest so the
  // user can quickly find an unbudgeted category to set.
  const sorted = useMemo(
    () =>
      [...lines].sort((a, b) => {
        if (b.planned !== a.planned) return b.planned - a.planned;
        if (b.spent !== a.spent) return b.spent - a.spent;
        return a.category.localeCompare(b.category);
      }),
    [lines],
  );

  // Bar chart (P2): only categories that have a plan or some spend.
  const chartLines = useMemo(
    () => sorted.filter((l) => l.planned > 0 || l.spent > 0),
    [sorted],
  );

  return (
    <div className="space-y-6">
      <MonthNav prevMonth={prevMonth} nextMonth={nextMonth} month={month} isCurrentMonth={isCurrentMonth} />

      <HeroCard
        month={month}
        totals={totals}
        overall={overall}
        anyPlanned={anyPlanned}
        pacing={pacing}
      />

      {canCopyForward && (
        <CopyForwardCard month={month} prevMonth={prevMonth} count={prevPlannedCount} />
      )}

      {chartLines.length > 1 && <CategoryChart lines={chartLines} />}

      {categories.length === 0 ? (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-8 text-center">
          <div className="text-3xl text-zinc-600">⊟</div>
          <p className="mt-2 text-sm text-zinc-300">No categories yet.</p>
          <p className="text-xs text-zinc-500">
            Add categories in the Expenses app — Budget shares them.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          <div className="px-1 text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Categories · {monthLabel(month)}
          </div>
          {sorted.map((line) => (
            <CategoryRowItem key={line.category} line={line} month={month} />
          ))}
        </div>
      )}

      <p className="px-1 text-xs text-zinc-600">
        Spending is pulled automatically from your Expenses for {monthLabel(month)}.
        Set a planned amount per category; tap a category to edit it.
      </p>
    </div>
  );
}

function MonthNav({
  prevMonth,
  nextMonth,
  month,
  isCurrentMonth,
}: {
  prevMonth: string;
  nextMonth: string;
  month: string;
  isCurrentMonth: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <Link
        href={`/app/budget?m=${prevMonth}`}
        className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-900/60 text-zinc-400 ring-1 ring-zinc-800 hover:text-cyan-300"
        aria-label={`Previous month (${monthLabel(prevMonth)})`}
      >
        ‹
      </Link>
      <div className="flex flex-col items-center">
        <span className="text-sm font-semibold text-zinc-200">{monthLabel(month)}</span>
        {!isCurrentMonth && (
          <Link href="/app/budget" className="text-[11px] text-cyan-400 hover:text-cyan-300">
            Jump to this month
          </Link>
        )}
      </div>
      <Link
        href={`/app/budget?m=${nextMonth}`}
        className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-900/60 text-zinc-400 ring-1 ring-zinc-800 hover:text-cyan-300"
        aria-label={`Next month (${monthLabel(nextMonth)})`}
      >
        ›
      </Link>
    </div>
  );
}

function CopyForwardCard({
  month,
  prevMonth,
  count,
}: {
  month: string;
  prevMonth: string;
  count: number;
}) {
  const [pending, start] = useTransition();

  function run(rollover: boolean) {
    const fd = new FormData();
    fd.set("month", month);
    fd.set("rollover", rollover ? "1" : "0");
    start(async () => {
      await copyForwardAction(fd);
    });
  }

  return (
    <div className="rounded-2xl border border-cyan-500/30 bg-cyan-500/5 p-4">
      <p className="text-sm text-zinc-200">
        No budget set for {monthLabel(month)}.
      </p>
      <p className="mt-0.5 text-xs text-zinc-400">
        Copy your {count} {count === 1 ? "category" : "categories"} from{" "}
        {monthLabel(prevMonth)}?
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => run(false)}
          disabled={pending}
          className="rounded-lg bg-cyan-500 px-3 py-2 text-sm font-semibold text-zinc-950 hover:bg-cyan-400 disabled:opacity-50"
        >
          {pending ? "…" : "Copy amounts"}
        </button>
        <button
          type="button"
          onClick={() => run(true)}
          disabled={pending}
          className="rounded-lg bg-zinc-800 px-3 py-2 text-sm font-medium text-zinc-200 hover:bg-zinc-700 disabled:opacity-50"
          title="Carry last month's unspent remainder into this month's allowance"
        >
          Copy + roll over unspent
        </button>
      </div>
    </div>
  );
}

function HeroCard({
  month,
  totals,
  overall,
  anyPlanned,
  pacing,
}: {
  month: string;
  totals: Totals;
  overall: boolean;
  anyPlanned: boolean;
  pacing: ReturnType<typeof pace>;
}) {
  const remaining = totals.remaining;
  const pct = totals.planned > 0 ? (totals.spent / totals.planned) * 100 : 0;

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
      <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
        {monthLabel(month)}
      </div>
      {anyPlanned ? (
        <>
          <div className="mt-2 flex items-center gap-4">
            <Ring
              pct={pct / 100}
              size={76}
              stroke={9}
              tone={overall ? "rose" : pacing?.aheadOfPace ? "amber" : "cyan"}
            >
              <span className="text-[13px] font-bold tabular-nums text-zinc-200">
                {Math.round(pct)}%
              </span>
            </Ring>
            <div className="min-w-0">
              <div className="flex items-baseline gap-2">
                <span className={`text-3xl font-bold ${overall ? "text-red-400" : "text-cyan-300"}`}>
                  {fmt(Math.abs(remaining))}
                </span>
                <span className="text-sm text-zinc-400">
                  {remaining >= 0 ? "left of" : "over"} {fmt(totals.planned)}
                </span>
              </div>
              <div className="mt-1 text-xs text-zinc-500">
                {fmt(totals.spent)} spent · {fmt(totals.planned)} planned
              </div>
            </div>
          </div>
          {overall && (
            <div className="mt-3 rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              Over budget by {fmt(totals.spent - totals.planned)} this month.
            </div>
          )}
          {!overall && pacing?.aheadOfPace && (
            <div className="mt-3 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-300">
              You&apos;re {Math.round(pacing.monthFraction * 100)}% through the month
              and have spent {Math.round(pacing.spendFraction * 100)}% of your budget —
              slow down to stay on track.
            </div>
          )}
        </>
      ) : (
        <>
          <div className="mt-1 text-2xl font-semibold text-zinc-100">
            {fmt(totals.spent)} spent
          </div>
          <p className="mt-2 text-sm text-zinc-400">
            No budget set yet. Add a planned amount to a category below to start
            tracking planned vs. actual.
          </p>
        </>
      )}
    </div>
  );
}

function CategoryChart({ lines }: { lines: BudgetLine[] }) {
  // Scale every bar against the largest planned-or-spent value so the longest
  // bar fills the track.
  const max = Math.max(...lines.map((l) => Math.max(l.planned, l.spent)), 1);

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
          Planned vs. spent
        </span>
        <span className="flex items-center gap-3 text-[11px] text-zinc-500">
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-sm bg-zinc-600" />
            Planned
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-sm bg-cyan-500" />
            Spent
          </span>
        </span>
      </div>
      <div className="space-y-2.5">
        {lines.map((l) => {
          const over = isOver(l);
          const plannedW = (l.planned / max) * 100;
          const spentW = (l.spent / max) * 100;
          return (
            <div key={l.category}>
              <div className="mb-0.5 flex items-baseline justify-between text-[11px]">
                <span className="truncate text-zinc-300">{l.category}</span>
                <span className={over ? "text-red-400" : "text-zinc-500"}>
                  {fmt(l.spent)} / {fmt(l.planned)}
                </span>
              </div>
              {/* Planned (ghost) track with the spent bar overlaid. */}
              <div className="relative h-3 overflow-hidden rounded bg-zinc-800/60">
                <div
                  className="absolute inset-y-0 left-0 rounded bg-zinc-700"
                  style={{ width: `${Math.max(plannedW, l.planned > 0 ? 2 : 0)}%` }}
                  aria-hidden
                />
                <div
                  className={`absolute inset-y-0 left-0 rounded ${over ? "bg-red-500" : "bg-cyan-500"}`}
                  style={{ width: `${Math.max(spentW, l.spent > 0 ? 2 : 0)}%` }}
                  aria-hidden
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CategoryRowItem({ line, month }: { line: BudgetLine; month: string }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(line.planned > 0 ? String(line.planned) : "");
  const [pending, start] = useTransition();

  const remaining = line.planned - line.spent;
  const over = isOver(line);
  const pct = line.planned > 0 ? (line.spent / line.planned) * 100 : 0;
  const budgeted = line.planned > 0;

  function save() {
    const planned = Number(value.trim() || "0");
    if (!Number.isFinite(planned) || planned < 0) return;
    const fd = new FormData();
    fd.set("category", line.category);
    fd.set("month", month);
    fd.set("planned", String(planned));
    start(async () => {
      await setBudgetTargetAction(fd);
      setEditing(false);
    });
  }

  function cancel() {
    setValue(line.planned > 0 ? String(line.planned) : "");
    setEditing(false);
  }

  return (
    <div
      className={`rounded-xl border bg-zinc-900/40 px-3 py-3 ${
        over ? "border-red-500/40" : "border-zinc-800"
      } ${pending ? "opacity-60" : ""}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-2 text-sm font-medium text-zinc-200">
          <span
            className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: line.color }}
            aria-hidden
          />
          <span className="truncate">{line.category}</span>
        </span>
        {!editing && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="shrink-0 rounded-lg px-2 py-1 text-xs font-medium text-zinc-400 hover:bg-zinc-800 hover:text-cyan-300"
          >
            {budgeted ? "Edit" : "Set budget"}
          </button>
        )}
      </div>

      {editing ? (
        <div className="mt-2 flex items-center gap-2">
          <span className="text-base text-zinc-500">$</span>
          <input
            type="number"
            step="0.01"
            min="0"
            inputMode="decimal"
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                save();
              } else if (e.key === "Escape") {
                cancel();
              }
            }}
            placeholder="Planned amount"
            className="flex-1 rounded-lg bg-zinc-900 px-3 py-2 text-base text-zinc-100 placeholder:text-zinc-500 outline-none ring-1 ring-zinc-800 focus:ring-cyan-500/50"
          />
          <button
            type="button"
            onClick={save}
            disabled={pending}
            className="flex h-9 items-center rounded-lg bg-cyan-500 px-3 text-sm font-semibold text-zinc-950 hover:bg-cyan-400 disabled:opacity-50"
          >
            {pending ? "…" : "Save"}
          </button>
          <button
            type="button"
            onClick={cancel}
            disabled={pending}
            className="flex h-9 items-center rounded-lg bg-zinc-800 px-3 text-sm font-medium text-zinc-300 hover:bg-zinc-700"
          >
            Cancel
          </button>
        </div>
      ) : budgeted ? (
        <>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-800">
            <div
              className={`h-full rounded-full ${over ? "bg-red-500" : "bg-cyan-500"}`}
              style={{ width: `${Math.min(Math.max(pct, 2), 100)}%` }}
            />
          </div>
          <div className="mt-1.5 flex items-center justify-between text-xs">
            <span className="text-zinc-400">
              {fmt(line.spent)} <span className="text-zinc-600">of {fmt(line.planned)}</span>
            </span>
            <StatusPill
              label={over ? `${fmt(line.spent - line.planned)} over` : `${fmt(remaining)} left`}
              tone={over ? "rose" : "cyan"}
            />
          </div>
        </>
      ) : (
        <div className="mt-1.5 text-xs text-zinc-500">
          {line.spent > 0 ? (
            <span>{fmt(line.spent)} spent · no budget set</span>
          ) : (
            <span>No budget set</span>
          )}
        </div>
      )}
    </div>
  );
}
