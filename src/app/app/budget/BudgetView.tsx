"use client";

import { useMemo, useState, useTransition } from "react";
import type { BudgetLine, CategoryRow } from "./page";
import { setBudgetTargetAction } from "./actions";

function fmt(amount: number): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
    }).format(amount);
  } catch {
    return `$${amount.toFixed(2)}`;
  }
}

function monthLabel(monthISO: string): string {
  const d = new Date(monthISO + "T00:00:00");
  return d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

export function BudgetView({
  month,
  categories,
  lines,
}: {
  month: string;
  categories: CategoryRow[];
  lines: BudgetLine[];
}) {
  const totals = useMemo(() => {
    let planned = 0;
    let spent = 0;
    for (const l of lines) {
      planned += l.planned;
      spent += l.spent;
    }
    return { planned, spent, remaining: planned - spent };
  }, [lines]);

  const overall = totals.spent > totals.planned && totals.planned > 0;
  const anyPlanned = totals.planned > 0;

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

  return (
    <div className="space-y-6">
      <HeroCard month={month} totals={totals} overall={overall} anyPlanned={anyPlanned} />

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

function HeroCard({
  month,
  totals,
  overall,
  anyPlanned,
}: {
  month: string;
  totals: { planned: number; spent: number; remaining: number };
  overall: boolean;
  anyPlanned: boolean;
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
          <div className="mt-1 flex items-baseline gap-2">
            <span
              className={`text-3xl font-bold ${
                overall ? "text-red-400" : "text-cyan-300"
              }`}
            >
              {fmt(Math.abs(remaining))}
            </span>
            <span className="text-sm text-zinc-400">
              {remaining >= 0 ? "left of" : "over"} {fmt(totals.planned)}
            </span>
          </div>
          <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-zinc-800">
            <div
              className={`h-full rounded-full ${overall ? "bg-red-500" : "bg-cyan-500"}`}
              style={{ width: `${Math.min(Math.max(pct, 2), 100)}%` }}
            />
          </div>
          <div className="mt-2 flex justify-between text-xs text-zinc-500">
            <span>{fmt(totals.spent)} spent</span>
            <span>{fmt(totals.planned)} planned</span>
          </div>
          {overall && (
            <div className="mt-3 rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              Over budget by {fmt(totals.spent - totals.planned)} this month.
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

function CategoryRowItem({ line, month }: { line: BudgetLine; month: string }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(line.planned > 0 ? String(line.planned) : "");
  const [pending, start] = useTransition();

  const remaining = line.planned - line.spent;
  const over = line.planned > 0 && line.spent > line.planned;
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
          <div className="mt-1.5 flex items-baseline justify-between text-xs">
            <span className="text-zinc-400">
              {fmt(line.spent)} <span className="text-zinc-600">of {fmt(line.planned)}</span>
            </span>
            <span className={over ? "font-semibold text-red-400" : "text-zinc-400"}>
              {over
                ? `${fmt(line.spent - line.planned)} over`
                : `${fmt(remaining)} left`}
            </span>
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
