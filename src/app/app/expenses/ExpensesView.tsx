"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import type { CategoryRow, ExpenseRow } from "./page";
import {
  addCategoryAction,
  addExpenseAction,
  deleteCategoryAction,
  deleteExpenseAction,
  updateExpenseAction,
} from "./actions";

export interface BreakdownSlice {
  name: string;
  total: number;
  color: string;
  pct: number;
}

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

const PALETTE = [
  "#06b6d4",
  "#f59e0b",
  "#3b82f6",
  "#8b5cf6",
  "#14b8a6",
  "#ec4899",
  "#ef4444",
  "#84cc16",
  "#f97316",
  "#a855f7",
];

export function ExpensesView({
  expenses,
  monthTotal,
  weekTotal,
  categories,
  breakdown,
}: {
  expenses: ExpenseRow[];
  monthTotal: number;
  weekTotal: number;
  categories: CategoryRow[];
  breakdown: BreakdownSlice[];
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

  const categoryNames = categories.map((c) => c.name);

  return (
    <div className="space-y-6">
      <SummaryCard monthTotal={monthTotal} weekTotal={weekTotal} />
      {breakdown.length > 0 && (
        <BreakdownCard breakdown={breakdown} monthTotal={monthTotal} />
      )}
      <AddExpenseForm categories={categories} />
      <ManageCategories categories={categories} />

      {expenses.length === 0 ? (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-8 text-center">
          <div className="text-3xl text-zinc-600">⟢</div>
          <p className="mt-2 text-sm text-zinc-300">No expenses yet.</p>
          <p className="text-xs text-zinc-500">Add one above to start tracking.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {groups.map(([date, items]) => (
            <DateGroup key={date} date={date} items={items} categoryNames={categoryNames} />
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

function BreakdownCard({
  breakdown,
  monthTotal,
}: {
  breakdown: BreakdownSlice[];
  monthTotal: number;
}) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
      <div className="mb-3 flex items-baseline justify-between">
        <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
          This month by category
        </div>
        <div className="text-xs font-semibold text-zinc-400">{fmt(monthTotal)}</div>
      </div>
      <ul className="space-y-2.5">
        {breakdown.map((s) => (
          <li key={s.name}>
            <div className="mb-1 flex items-baseline justify-between text-xs">
              <span className="flex items-center gap-1.5 text-zinc-300">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: s.color }}
                  aria-hidden
                />
                {s.name}
              </span>
              <span className="text-zinc-400">
                {fmt(s.total)}
                <span className="ml-1.5 text-zinc-600">{Math.round(s.pct)}%</span>
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.max(s.pct, 2)}%`,
                  backgroundColor: s.color,
                }}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function CategoryChips({
  categories,
  selected,
  onSelect,
}: {
  categories: CategoryRow[];
  selected: string;
  onSelect: (name: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {categories.map((c) => {
        const active = selected === c.name;
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => onSelect(c.name)}
            className={`flex min-h-[36px] items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
              active
                ? "bg-cyan-500/20 text-cyan-300 ring-1 ring-cyan-500/50"
                : "bg-zinc-800/60 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
            }`}
          >
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: c.color }}
              aria-hidden
            />
            {c.name}
          </button>
        );
      })}
    </div>
  );
}

function AddExpenseForm({ categories }: { categories: CategoryRow[] }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, start] = useTransition();
  const firstCat = categories[0]?.name ?? "Other";
  const [category, setCategory] = useState<string>(firstCat);
  const [date, setDate] = useState<string>(todayISO());

  function submit(formData: FormData) {
    formData.set("category", category);
    formData.set("expense_date", date);
    const amount = Number(String(formData.get("amount") || "").trim());
    if (!Number.isFinite(amount) || amount <= 0) return;
    start(async () => {
      await addExpenseAction(formData);
      formRef.current?.reset();
      setCategory(firstCat);
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

      <CategoryChips categories={categories} selected={category} onSelect={setCategory} />

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

function ManageCategories({ categories }: { categories: CategoryRow[] }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [name, setName] = useState("");
  const nextColor = PALETTE[categories.length % PALETTE.length];
  const [color, setColor] = useState(nextColor);

  function add() {
    const trimmed = name.trim();
    if (!trimmed) return;
    const fd = new FormData();
    fd.set("name", trimmed);
    fd.set("color", color);
    start(async () => {
      await addCategoryAction(fd);
      setName("");
      setColor(PALETTE[(categories.length + 1) % PALETTE.length]);
    });
  }

  function remove(id: number) {
    if (!confirm("Delete this category? Existing expenses keep their tag.")) return;
    start(() => deleteCategoryAction(id));
  }

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex min-h-[44px] w-full items-center justify-between px-4 py-3 text-left"
      >
        <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
          Categories ({categories.length})
        </span>
        <span className="text-zinc-500">{open ? "▴" : "▾"}</span>
      </button>
      {open && (
        <div className="space-y-3 border-t border-zinc-800 p-3">
          <ul className="flex flex-wrap gap-1.5">
            {categories.map((c) => (
              <li
                key={c.id}
                className={`flex items-center gap-1.5 rounded-lg bg-zinc-800/60 py-1 pl-2 pr-1 text-xs text-zinc-300 ${
                  pending ? "opacity-60" : ""
                }`}
              >
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: c.color }}
                  aria-hidden
                />
                {c.name}
                <button
                  type="button"
                  onClick={() => remove(c.id)}
                  aria-label={`Delete ${c.name}`}
                  className="flex h-6 w-6 items-center justify-center rounded text-zinc-500 hover:bg-zinc-700 hover:text-red-400"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              aria-label="Category color"
              className="h-9 w-9 cursor-pointer rounded-lg border border-zinc-700 bg-transparent p-0.5"
            />
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  add();
                }
              }}
              maxLength={40}
              placeholder="New category"
              className="flex-1 rounded-lg bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none ring-1 ring-zinc-800 focus:ring-cyan-500/50"
            />
            <button
              type="button"
              onClick={add}
              disabled={pending || !name.trim()}
              className="flex h-9 items-center rounded-lg bg-cyan-500 px-3 text-sm font-semibold text-zinc-950 hover:bg-cyan-400 disabled:opacity-50"
            >
              + New
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function DateGroup({
  date,
  items,
  categoryNames,
}: {
  date: string;
  items: ExpenseRow[];
  categoryNames: string[];
}) {
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
          <ExpenseRowItem key={e.id} expense={e} categoryNames={categoryNames} />
        ))}
      </ul>
    </div>
  );
}

function ExpenseRowItem({
  expense,
  categoryNames,
}: {
  expense: ExpenseRow;
  categoryNames: string[];
}) {
  const [pending, start] = useTransition();
  const [editing, setEditing] = useState(false);
  const [amount, setAmount] = useState(String(expense.amount));
  const [category, setCategory] = useState(expense.category);
  const [date, setDate] = useState(expense.expense_date);
  const [description, setDescription] = useState(expense.description || "");

  function remove() {
    if (!confirm("Delete this expense?")) return;
    start(() => deleteExpenseAction(expense.id));
  }

  function save() {
    const amt = Number(amount.trim());
    if (!Number.isFinite(amt) || amt <= 0) return;
    const fd = new FormData();
    fd.set("id", String(expense.id));
    fd.set("amount", String(amt));
    fd.set("category", category);
    fd.set("expense_date", date);
    fd.set("description", description.trim());
    start(async () => {
      await updateExpenseAction(fd);
      setEditing(false);
    });
  }

  function cancel() {
    setAmount(String(expense.amount));
    setCategory(expense.category);
    setDate(expense.expense_date);
    setDescription(expense.description || "");
    setEditing(false);
  }

  if (editing) {
    // Ensure the row's current (possibly deleted) category is still selectable.
    const opts = categoryNames.includes(category)
      ? categoryNames
      : [category, ...categoryNames];
    return (
      <li className="space-y-2 rounded-xl border border-cyan-500/40 bg-zinc-900/60 px-3 py-3">
        <div className="flex items-center gap-2">
          <span className="text-base text-zinc-500">$</span>
          <input
            type="number"
            step="0.01"
            min="0"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="flex-1 bg-transparent px-1 py-1.5 text-base text-zinc-100 outline-none"
          />
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-lg bg-zinc-900 px-2 py-1.5 text-sm text-zinc-200 ring-1 ring-zinc-800 outline-none focus:ring-cyan-500/50"
          />
        </div>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full rounded-lg bg-zinc-900 px-2 py-2 text-sm text-zinc-100 ring-1 ring-zinc-800 outline-none focus:ring-cyan-500/50"
        >
          {opts.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description (optional)"
          className="w-full rounded-lg bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none ring-1 ring-zinc-800 focus:ring-cyan-500/50"
        />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={save}
            disabled={pending}
            className="flex h-9 flex-1 items-center justify-center rounded-lg bg-cyan-500 text-sm font-semibold text-zinc-950 hover:bg-cyan-400 disabled:opacity-50"
          >
            {pending ? "Saving…" : "Save"}
          </button>
          <button
            type="button"
            onClick={cancel}
            disabled={pending}
            className="flex h-9 items-center justify-center rounded-lg bg-zinc-800 px-4 text-sm font-medium text-zinc-300 hover:bg-zinc-700"
          >
            Cancel
          </button>
        </div>
      </li>
    );
  }

  return (
    <li
      className={`flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/40 px-3 py-3 ${
        pending ? "opacity-50" : ""
      }`}
    >
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="min-w-0 flex-1 text-left"
        aria-label="Edit expense"
      >
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
      </button>
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
