"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import type { InventoryItem } from "./lib";
import { formatMoney, searchItems, statsFor } from "./lib";
import { addItem, deleteItem, updateItem } from "./actions";

export function InventoryView({ items }: { items: InventoryItem[] }) {
  const [query, setQuery] = useState("");
  const stats = useMemo(() => statsFor(items), [items]);
  const filtered = useMemo(() => searchItems(items, query), [items, query]);

  return (
    <div className="space-y-6">
      <Hero worth={stats.worth} count={stats.count} units={stats.units} locations={stats.locations} />

      <AddItemForm />

      {items.length > 0 && (
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name, category or location…"
          className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-cyan-500/60"
        />
      )}

      {items.length === 0 ? (
        <EmptyState />
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 text-center text-sm text-zinc-400">
          No items match &ldquo;{query}&rdquo;.
        </div>
      ) : (
        <ul className="space-y-2">
          {filtered.map((it) => (
            <ItemRow key={it.id} it={it} />
          ))}
        </ul>
      )}
    </div>
  );
}

function Hero({
  worth,
  count,
  units,
  locations,
}: {
  worth: number;
  count: number;
  units: number;
  locations: number;
}) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 text-center">
      <div className="text-4xl font-bold tabular-nums text-cyan-400">{formatMoney(worth)}</div>
      <p className="mt-1 text-xs font-medium uppercase tracking-wider text-zinc-500">total worth</p>
      <div className="mt-4 grid grid-cols-3 gap-2">
        <Stat label="Items" value={String(count)} />
        <Stat label="Units" value={String(units)} />
        <Stat label="Locations" value={String(locations)} />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 px-2 py-2 text-center">
      <div className="text-base font-semibold tabular-nums text-zinc-100">{value}</div>
      <div className="mt-0.5 text-[10px] font-medium uppercase tracking-wider text-zinc-500">{label}</div>
    </div>
  );
}

function AddItemForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, start] = useTransition();

  function submit(formData: FormData) {
    const name = String(formData.get("name") || "").trim();
    if (!name) return;
    const quantityRaw = String(formData.get("quantity") || "").trim();
    const valueRaw = String(formData.get("value") || "").trim();
    start(async () => {
      await addItem({
        name,
        quantity: quantityRaw ? Number(quantityRaw) : 1,
        value: valueRaw ? Number(valueRaw) : null,
        location: String(formData.get("location") || "").trim(),
        category: String(formData.get("category") || "").trim(),
        photoUrl: String(formData.get("photoUrl") || "").trim(),
      });
      formRef.current?.reset();
    });
  }

  return (
    <form
      ref={formRef}
      action={submit}
      className="space-y-2 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-3"
    >
      <input
        name="name"
        autoComplete="off"
        placeholder="Item (e.g. Sofa)"
        className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-base text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-cyan-500/60"
      />
      <div className="flex flex-col gap-2 sm:flex-row">
        <label className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2">
          <span className="text-xs text-zinc-500">Qty</span>
          <input
            name="quantity"
            type="number"
            min={1}
            step={1}
            inputMode="numeric"
            defaultValue={1}
            className="w-16 min-w-0 bg-transparent text-sm text-zinc-100 outline-none"
          />
        </label>
        <label className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2">
          <span className="text-xs text-zinc-500">$</span>
          <input
            name="value"
            type="number"
            min={0}
            step="0.01"
            inputMode="decimal"
            placeholder="Value each (optional)"
            className="min-w-0 flex-1 bg-transparent text-sm text-zinc-100 placeholder:text-zinc-500 outline-none"
          />
        </label>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          name="location"
          autoComplete="off"
          placeholder="Room / location (optional)"
          className="min-w-0 flex-1 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-cyan-500/60"
        />
        <input
          name="category"
          autoComplete="off"
          placeholder="Category (optional)"
          className="min-w-0 flex-1 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-cyan-500/60"
        />
      </div>
      <input
        name="photoUrl"
        autoComplete="off"
        type="url"
        placeholder="Photo URL (optional, for proof of ownership)"
        className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-cyan-500/60"
      />
      <button
        type="submit"
        disabled={pending}
        className="min-h-[44px] w-full rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-cyan-400 disabled:opacity-50"
      >
        Add item
      </button>
    </form>
  );
}

function ItemRow({ it }: { it: InventoryItem }) {
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);

  function remove() {
    if (!confirm(`Delete ${it.name}?`)) return;
    start(() => deleteItem(it.id));
  }

  return (
    <li className={`rounded-xl border border-zinc-800 bg-zinc-900/40 ${pending ? "opacity-50" : ""}`}>
      <div className="flex items-center gap-3 py-3 pl-3 pr-2">
        {it.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={it.photoUrl}
            alt=""
            className="h-10 w-10 shrink-0 rounded-lg border border-zinc-800 object-cover"
          />
        ) : (
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-600">
            ▦
          </span>
        )}
        <button type="button" onClick={() => setOpen((o) => !o)} className="min-w-0 flex-1 text-left">
          <div className="flex flex-wrap items-baseline gap-x-2">
            <span className="break-words text-sm font-medium text-zinc-100">{it.name}</span>
            {it.quantity > 1 && <span className="text-xs text-zinc-500">×{it.quantity}</span>}
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-zinc-500">
            {it.location && <span>{it.location}</span>}
            {it.category && (
              <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-400">{it.category}</span>
            )}
          </div>
        </button>
        <div className="shrink-0 text-right">
          {it.value !== null ? (
            <>
              <div className="text-sm font-semibold tabular-nums text-cyan-300">{formatMoney(it.worth)}</div>
              {it.quantity > 1 && (
                <div className="text-[10px] text-zinc-500">{formatMoney(it.value)} ea</div>
              )}
            </>
          ) : (
            <div className="text-xs text-zinc-600">—</div>
          )}
        </div>
        <button
          type="button"
          onClick={remove}
          disabled={pending}
          aria-label={`Delete ${it.name}`}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-800 hover:text-red-400"
        >
          <span className="text-lg leading-none">×</span>
        </button>
      </div>

      {open && <EditPanel it={it} onDone={() => setOpen(false)} />}
    </li>
  );
}

function EditPanel({ it, onDone }: { it: InventoryItem; onDone: () => void }) {
  const [pending, start] = useTransition();

  function submit(formData: FormData) {
    const name = String(formData.get("name") || "").trim();
    if (!name) return;
    const quantityRaw = String(formData.get("quantity") || "").trim();
    const valueRaw = String(formData.get("value") || "").trim();
    start(async () => {
      await updateItem(it.id, {
        name,
        quantity: quantityRaw ? Number(quantityRaw) : 1,
        value: valueRaw ? Number(valueRaw) : null,
        location: String(formData.get("location") || "").trim(),
        category: String(formData.get("category") || "").trim(),
        photoUrl: String(formData.get("photoUrl") || "").trim(),
      });
      onDone();
    });
  }

  const inputCls =
    "w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-cyan-500/60";

  return (
    <form action={submit} className="space-y-2 border-t border-zinc-800 px-3 py-3">
      <input name="name" defaultValue={it.name} placeholder="Name" className={inputCls} />
      <div className="flex flex-col gap-2 sm:flex-row">
        <label className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2">
          <span className="text-xs text-zinc-500">Qty</span>
          <input
            name="quantity"
            type="number"
            min={1}
            step={1}
            defaultValue={it.quantity}
            className="w-16 min-w-0 bg-transparent text-sm text-zinc-100 outline-none"
          />
        </label>
        <label className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2">
          <span className="text-xs text-zinc-500">$</span>
          <input
            name="value"
            type="number"
            min={0}
            step="0.01"
            defaultValue={it.value ?? ""}
            placeholder="Value each"
            className="min-w-0 flex-1 bg-transparent text-sm text-zinc-100 placeholder:text-zinc-500 outline-none"
          />
        </label>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input name="location" defaultValue={it.location ?? ""} placeholder="Room / location" className={inputCls} />
        <input name="category" defaultValue={it.category ?? ""} placeholder="Category" className={inputCls} />
      </div>
      <input name="photoUrl" type="url" defaultValue={it.photoUrl ?? ""} placeholder="Photo URL" className={inputCls} />
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="min-h-[44px] flex-1 rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-cyan-400 disabled:opacity-50"
        >
          Save
        </button>
        <button
          type="button"
          onClick={onDone}
          className="min-h-[44px] rounded-lg border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-800"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-8 text-center">
      <div className="text-3xl text-zinc-600">▦</div>
      <p className="mt-2 text-sm text-zinc-300">Nothing inventoried yet.</p>
      <p className="text-xs text-zinc-500">
        Add what you own with its value and where it lives — we&apos;ll total it up for insurance.
      </p>
    </div>
  );
}
