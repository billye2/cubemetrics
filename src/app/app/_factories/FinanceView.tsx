"use client";

import { useRef, useState, useTransition } from "react";
import {
  financeAddAction,
  financeTogglePaidAction,
  financeDeleteAction,
} from "./actions";
import type { FactoryConfig } from "@/lib/modern/catalog";

interface Item {
  id: number;
  name: string;
  amount: number;
  category: string | null;
  paid: boolean;
  due_date: string | null;
  created_at: string;
}

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
  const formRef = useRef<HTMLFormElement>(null);
  const [showForm, setShowForm] = useState(false);
  const [pending, start] = useTransition();
  const unpaid = items.filter((i) => !i.paid);
  const paid = items.filter((i) => i.paid);
  const [showPaid, setShowPaid] = useState(false);

  const totalUnpaid = unpaid.reduce((acc, i) => acc + Number(i.amount || 0), 0);

  function submit(formData: FormData) {
    const name = String(formData.get("name") || "").trim();
    const amount = Number(formData.get("amount") || 0);
    const category = String(formData.get("category") || "");
    const dueDate = config.hasDueDate ? String(formData.get("due_date") || "") || null : null;
    if (!name) return;
    start(async () => {
      await financeAddAction(appId, itemType, name, amount, category, dueDate);
      formRef.current?.reset();
      setShowForm(false);
    });
  }

  return (
    <div>
      <div className="mb-4 flex flex-col items-center rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
        <div className="text-xs uppercase tracking-wider text-zinc-500">Outstanding</div>
        <div className="mt-1 text-3xl font-bold text-amber-300">${totalUnpaid.toFixed(2)}</div>
        <div className="mt-0.5 text-xs text-zinc-500">{unpaid.length} {unpaid.length === 1 ? "item" : "items"}</div>
      </div>

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
            <Row key={i.id} appId={appId} item={i} hasDueDate={!!config.hasDueDate} />
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
                <Row key={i.id} appId={appId} item={i} hasDueDate={!!config.hasDueDate} />
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function Row({ appId, item, hasDueDate }: { appId: string; item: Item; hasDueDate: boolean }) {
  const [pending, start] = useTransition();
  function toggle() {
    start(() => financeTogglePaidAction(appId, item.id, !item.paid));
  }
  function remove() {
    if (!confirm("Delete?")) return;
    start(() => financeDeleteAction(appId, item.id));
  }
  const dueLabel = hasDueDate && item.due_date
    ? new Date(item.due_date).toLocaleDateString(undefined, { month: "short", day: "numeric" })
    : null;

  return (
    <li className={`flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/40 px-3 py-3 ${pending ? "opacity-50" : ""}`}>
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
          {dueLabel && <div className="text-xs text-amber-300">{dueLabel}</div>}
        </div>
        {item.category && <div className="truncate text-xs text-zinc-500">{item.category}</div>}
      </div>
      <div className={`text-right text-sm font-semibold ${item.paid ? "text-zinc-500" : "text-zinc-100"}`}>
        ${Number(item.amount || 0).toFixed(2)}
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
