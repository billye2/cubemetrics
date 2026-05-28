"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import type { ExpenseRow } from "./page";
import { addExpenseAction, deleteExpenseAction } from "./actions";

function todayISO(): string {
  return new Date().toISOString().split("T")[0];
}

function fmt(amount: number, currency = "USD"): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `$${amount.toFixed(2)}`;
  }
}

function fmtDateHeader(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function ExpensesView({
  expenses,
  monthTotal,
  weekTotal,
  categories,
}: {
  expenses: ExpenseRow[];
  monthTotal: number;
  weekTotal: number;
  categories: string[];
}) {
  const groups = useMemo(() => {
    const map = new Map<string, ExpenseRow[]>();
    for (const e of expenses) {
      const list = map.get(e.expense_date) || [];
      list.push(e);
      map.set(e.expense_date, list);
    }
    return Array.from(map.entries()).sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [expenses]);

  return (
    <div className="space-y-6">
      <SummaryCard monthTotal={monthTotal} weekTotal={weekTotal} />
      <AddExpenseForm categories={categories} />

      {expenses.length === 0 ? (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-8 text-center">
          <div className="text-3xl text-zinc-600">⟢</div>
          <p className="mt-2 text-sm text-zinc-300">No expenses yet.</p>
          <p className="text-xs text-zinc-500">Add one above to start tracking.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {groups.map(([date, items]) => (
            <DateGroup key={date} date={date} items={items} />
          ))}
        </div>
      )}
    </div>
  );
}

function SummaryCard({
  monthTotal,
  weekTotal,
}: {
  monthTotal: number;
  weekTotal: number;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
        <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
          This month
        </div>
        <div className="mt-1 text-2xl font-semibold text-cyan-300">
          {fmt(monthTotal)}
        </div>
      </div>
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
        <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
          This week
        </div>
        <div className="mt-1 text-2xl font-semibold text-zinc-100">
          {fmt(weekTotal)}
        </div>
      </div>
    </div>
  );
}

function AddExpenseForm({ categories }: { categories: string[] }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, start] = useTransition();
  const [category, setCategory] = useState<string>("Food");
  const [date, setDate] = useState<string>(todayISO());

  function submit(formData: FormData) {
    formData.set("category", category);
    formData.set("expense_date", date);
    const amount = Number(String(formData.get("amount") || "").trim());
    if (!Number.isFinite(amount) || amount <= 0) return;
    start(async () => {
      await addExpenseAction(formData);
      formRef.current?.reset();
      setCategory("Food");
      setDate(todayISO());
    });
  }

  return (
    <form
      ref={formRef}
      action={submit}
      className="space-y-3 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-3"
    >
      <div className="flex items-center gap-2">
        <span className="pl-2 text-base text-zinc-500">$</span>
        <input
          name="amount"
          type="number"
          step="0.01"
          min="0"
          inputMode="decimal"
          placeholder="0.00"
          required
          className="flex-1 bg-transparent px-1 py-2 text-base text-zinc-100 placeholder:text-zinc-500 outline-none"
        />
        <input
          name="expense_date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-lg bg-zinc-900 px-2 py-2 text-sm text-zinc-200 ring-1 ring-zinc-800 outline-none focus:ring-cyan-500/50"
        />
      </div>

      <div className="flex flex-wrap gap-1.5">
        {categories.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCategory(c)}
            className={`min-h-[36px] rounded-lg px-3 py-1.5 text-xs font-medium transition ${
              category === c
                ? "bg-cyan-500/20 text-cyan-300 ring-1 ring-cyan-500/50"
                : "bg-zinc-800/60 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      <input
        name="description"
        autoComplete="off"
        placeholder="Description (optional)"
        className="w-full rounded-lg bg-zinc-900 px-3 py-2 text-base text-zinc-100 placeholder:text-zinc-500 outline-none ring-1 ring-zinc-800 focus:ring-cyan-500/50"
      />

      <button
        type="submit"
        disabled={pending}
        className="flex h-11 w-full items-center justify-center rounded-xl bg-cyan-500 px-5 text-sm font-semibold text-zinc-950 hover:bg-cyan-400 disabled:opacity-50"
      >
        {pending ? "Saving…" : "Add expense"}
      </button>
    </form>
  );
}

function DateGroup({ date, items }: { date: string; items: ExpenseRow[] }) {
  const dayTotal = items.reduce((s, e) => s + (Number(e.amount) || 0), 0);
  return (
    <div>
      <div className="mb-2 flex items-center justify-between px-1 text-xs">
        <span className="font-semibold uppercase tracking-wider text-zinc-500">
          {fmtDateHeader(date)}
        </span>
        <span className="font-semibold text-zinc-400">{fmt(dayTotal)}</span>
      </div>
      <ul className="space-y-2">
        {items.map((e) => (
          <ExpenseRowItem key={e.id} expense={e} />
        ))}
      </ul>
    </div>
  );
}

function ExpenseRowItem({ expense }: { expense: ExpenseRow }) {
  const [pending, start] = useTransition();
  function remove() {
    if (!confirm("Delete this expense?")) return;
    start(() => deleteExpenseAction(expense.id));
  }
  return (
    <li
      className={`flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/40 px-3 py-3 ${
        pending ? "opacity-50" : ""
      }`}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="text-base font-semibold text-zinc-100">
            {fmt(Number(expense.amount), expense.currency || "USD")}
          </span>
          <span className="rounded-md bg-zinc-800 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-300">
            {expense.category}
          </span>
        </div>
        {expense.description && (
          <div className="mt-0.5 break-words text-xs text-zinc-400">
            {expense.description}
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={remove}
        aria-label="Delete expense"
        className="ml-1 flex h-9 w-9 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-800 hover:text-red-400"
      >
        <span className="text-lg leading-none">×</span>
      </button>
    </li>
  );
}
