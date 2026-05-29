"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import {
  financeAddAction,
  financeTogglePaidAction,
  financeDeleteAction,
} from "./actions";
import type { FactoryConfig } from "@/lib/modern/catalog";
import { currency, currencyCompact, dueInfo, monthlyFactor } from "./factoryLib";

interface Item {
  id: number;
  name: string;
  amount: number;
  category: string | null;
  frequency: string | null;
  paid: boolean;
  due_date: string | null;
  note: string | null;
  created_at: string;
}

const FREQUENCIES = ["monthly", "yearly", "weekly", "quarterly"];

const TONE_CLASS: Record<string, string> = {
  overdue: "text-red-400",
  today: "text-amber-300",
  soon: "text-amber-300",
  future: "text-zinc-500",
};

export function FinanceView({
  appId,
  config,
  items,
}: {
  appId: string;
  config: FactoryConfig;
  items: Item[];
}) {
  const itemType = config.itemType!;
  const isRecurring = itemType === "subscription";
  const formRef = useRef<HTMLFormElement>(null);
  const [showForm, setShowForm] = useState(false);
  const [pending, start] = useTransition();
  const [showPaid, setShowPaid] = useState(false);

  const unpaid = useMemo(
    () =>
      items
        .filter((i) => !i.paid)
        .sort((a, b) => {
          if (a.due_date && b.due_date) return a.due_date < b.due_date ? -1 : 1;
          if (a.due_date) return -1;
          if (b.due_date) return 1;
          return 0;
        }),
    [items],
  );
  const paid = useMemo(() => items.filter((i) => i.paid), [items]);

  const totalUnpaid = unpaid.reduce((acc, i) => acc + Number(i.amount || 0), 0);
  const overdueCount = unpaid.filter((i) => i.due_date && dueInfo(i.due_date).days < 0).length;

  // Recurring (subscriptions): normalize every item to a monthly figure.
  const monthlyRecurring = useMemo(
    () => items.reduce((acc, i) => acc + Number(i.amount || 0) * monthlyFactor(i.frequency), 0),
    [items],
  );

  const categoryBreakdown = useMemo(() => {
    const source = isRecurring ? items : unpaid;
    const map = new Map<string, number>();
    for (const i of source) {
      const key = (i.category || "Uncategorized").trim() || "Uncategorized";
      const amt = isRecurring ? Number(i.amount || 0) * monthlyFactor(i.frequency) : Number(i.amount || 0);
      map.set(key, (map.get(key) ?? 0) + amt);
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [items, unpaid, isRecurring]);

  function submit(formData: FormData) {
    const name = String(formData.get("name") || "").trim();
    const amount = Number(formData.get("amount") || 0);
    const category = String(formData.get("category") || "");
    const dueDate = config.hasDueDate ? String(formData.get("due_date") || "") || null : null;
    const frequency = isRecurring ? String(formData.get("frequency") || "monthly") : "monthly";
    if (!name) return;
    start(async () => {
      await financeAddAction(appId, itemType, name, amount, category, dueDate, frequency);
      formRef.current?.reset();
      setShowForm(false);
    });
  }

  const breakdownMax = Math.max(0.0001, ...categoryBreakdown.map(([, v]) => v));

  return (
    <div>
      <div className="mb-4 flex flex-col items-center rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
        <div className="text-xs uppercase tracking-wider text-zinc-500">
          {isRecurring ? "Monthly" : "Outstanding"}
        </div>
        <div className={`mt-1 text-3xl font-bold ${isRecurring ? "text-cyan-400" : "text-amber-300"}`}>
          {currencyCompact(isRecurring ? monthlyRecurring : totalUnpaid)}
        </div>
        <div className="mt-0.5 text-xs text-zinc-500">
          {isRecurring
            ? `${currencyCompact(monthlyRecurring * 12)} / year · ${items.length} active`
            : `${unpaid.length} ${unpaid.length === 1 ? "item" : "items"}${overdueCount > 0 ? ` · ${overdueCount} overdue` : ""}`}
        </div>
      </div>

      {categoryBreakdown.length > 1 && (
        <div className="mb-4 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
          <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
            By category{isRecurring ? " · monthly" : ""}
          </div>
          <ul className="space-y-2">
            {categoryBreakdown.map(([cat, amt]) => (
              <li key={cat} className="flex items-center gap-2">
                <span className="w-24 shrink-0 truncate text-xs text-zinc-400">{cat}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-zinc-800">
                  <div
                    className="h-full rounded-full bg-cyan-500/70"
                    style={{ width: `${Math.max(4, Math.round((amt / breakdownMax) * 100))}%` }}
                  />
                </div>
                <span className="w-16 shrink-0 text-right text-xs tabular-nums text-zinc-300">
                  {currency(amt)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {!showForm ? (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="flex h-11 w-full items-center justify-center rounded-xl bg-cyan-500 text-sm font-semibold text-zinc-950 hover:bg-cyan-400"
        >
          + Add item
        </button>
      ) : (
        <form ref={formRef} action={submit} className="space-y-2 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-3">
          <input
            name="name"
            autoComplete="off"
            autoFocus
            placeholder="Name"
            className="w-full rounded-lg bg-zinc-900 px-3 py-2 text-base text-zinc-100 placeholder:text-zinc-500 outline-none ring-1 ring-zinc-800 focus:ring-cyan-500/50"
          />
          <div className="flex gap-2">
            <input
              name="amount"
              type="number"
              inputMode="decimal"
              step="0.01"
              placeholder="Amount"
              className="flex-1 rounded-lg bg-zinc-900 px-3 py-2 text-base text-zinc-100 placeholder:text-zinc-500 outline-none ring-1 ring-zinc-800 focus:ring-cyan-500/50"
            />
            <input
              name="category"
              autoComplete="off"
              placeholder="Category"
              className="flex-1 rounded-lg bg-zinc-900 px-3 py-2 text-base text-zinc-100 placeholder:text-zinc-500 outline-none ring-1 ring-zinc-800 focus:ring-cyan-500/50"
            />
          </div>
          {isRecurring && (
            <select
              name="frequency"
              defaultValue="monthly"
              className="w-full rounded-lg bg-zinc-900 px-3 py-2 text-base text-zinc-100 outline-none ring-1 ring-zinc-800 focus:ring-cyan-500/50"
            >
              {FREQUENCIES.map((f) => (
                <option key={f} value={f}>
                  {f[0].toUpperCase() + f.slice(1)}
                </option>
              ))}
            </select>
          )}
          {config.hasDueDate && (
            <input
              name="due_date"
              type="date"
              className="w-full rounded-lg bg-zinc-900 px-3 py-2 text-base text-zinc-100 outline-none ring-1 ring-zinc-800 focus:ring-cyan-500/50"
            />
          )}
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

      {items.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-8 text-center">
          <p className="text-sm text-zinc-400">Nothing tracked yet.</p>
        </div>
      ) : (
        <ul className="mt-4 space-y-2">
          {unpaid.map((i) => (
            <Row key={i.id} appId={appId} item={i} isRecurring={isRecurring} />
          ))}
        </ul>
      )}

      {paid.length > 0 && (
        <div className="mt-6">
          <button
            type="button"
            onClick={() => setShowPaid((v) => !v)}
            className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-500 hover:text-zinc-300"
          >
            <span>{showPaid ? "▼" : "▶"}</span>
            Paid ({paid.length})
          </button>
          {showPaid && (
            <ul className="mt-3 space-y-2">
              {paid.map((i) => (
                <Row key={i.id} appId={appId} item={i} isRecurring={isRecurring} />
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function Row({ appId, item, isRecurring }: { appId: string; item: Item; isRecurring: boolean }) {
  const [pending, start] = useTransition();
  function toggle() {
    start(() => financeTogglePaidAction(appId, item.id, !item.paid));
  }
  function remove() {
    if (!confirm("Delete?")) return;
    start(() => financeDeleteAction(appId, item.id));
  }
  const due = !item.paid && item.due_date ? dueInfo(item.due_date) : null;
  const freqLabel = isRecurring ? `/${(item.frequency || "monthly").replace("ly", "").replace("month", "mo")}` : "";

  return (
    <li className={`flex items-center gap-3 rounded-xl border bg-zinc-900/40 px-3 py-3 ${pending ? "opacity-50" : ""} ${due?.tone === "overdue" ? "border-red-500/40" : "border-zinc-800"}`}>
      <button
        type="button"
        onClick={toggle}
        aria-label={item.paid ? "Mark unpaid" : "Mark paid"}
        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition ${
          item.paid ? "border-emerald-500 bg-emerald-500 text-zinc-950" : "border-zinc-600 hover:border-emerald-400"
        }`}
      >
        {item.paid && <span className="text-xs leading-none">✓</span>}
      </button>
      <div className="min-w-0 flex-1">
        <div className={`flex items-baseline gap-2 ${item.paid ? "text-zinc-500" : ""}`}>
          <div className={`truncate text-sm font-semibold ${item.paid ? "line-through" : "text-zinc-100"}`}>{item.name}</div>
          {due && <div className={`text-xs ${TONE_CLASS[due.tone]}`}>{due.label}</div>}
        </div>
        {item.category && <div className="truncate text-xs text-zinc-500">{item.category}</div>}
      </div>
      <div className={`text-right text-sm font-semibold ${item.paid ? "text-zinc-500" : "text-zinc-100"}`}>
        {currency(Number(item.amount || 0))}
        {freqLabel && <span className="text-xs font-normal text-zinc-500">{freqLabel}</span>}
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
