"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import type { InventoryItem } from "./lib";
import { formatMoney, searchItems, statsFor } from "./lib";
import { addItem, deleteItem, updateItem } from "./actions";

const UNGROUPED = "Unassigned";

type SortKey = "value" | "name" | "room";
type ViewMode = "list" | "grid";

// CSV cell escaping per RFC 4180.
function csvCell(v: string | number | null | undefined): string {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function buildCsv(items: InventoryItem[]): string {
  const header = [
    "Name",
    "Quantity",
    "Value (each)",
    "Total value",
    "Location",
    "Category",
    "Photo URL",
    "Receipt URL",
    "Warranty URL",
  ];
  const rows = items.map((it) =>
    [
      csvCell(it.name),
      csvCell(it.quantity),
      csvCell(it.value ?? ""),
      csvCell(it.worth),
      csvCell(it.location ?? ""),
      csvCell(it.category ?? ""),
      csvCell(it.photoUrl ?? ""),
      csvCell(it.receiptUrl ?? ""),
      csvCell(it.warrantyUrl ?? ""),
    ].join(","),
  );
  return [header.join(","), ...rows].join("\n");
}

export function InventoryView({ items }: { items: InventoryItem[] }) {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("value");
  const [viewMode, setViewMode] = useState<ViewMode>("list");

  const stats = useMemo(() => statsFor(items), [items]);

  // Category chips, recent-first (items already arrive created_at desc).
  const categories = useMemo(() => {
    const seen: string[] = [];
    for (const it of items) {
      const c = it.category?.trim();
      if (c && !seen.includes(c)) seen.push(c);
    }
    return seen;
  }, [items]);

  // Search + category filter.
  const filtered = useMemo(() => {
    const base = searchItems(items, query);
    if (!activeCategory) return base;
    return base.filter((it) => (it.category ?? "") === activeCategory);
  }, [items, query, activeCategory]);

  // Sorted copy.
  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      if (sortKey === "name") return a.name.localeCompare(b.name);
      if (sortKey === "room") {
        return (a.location ?? UNGROUPED).localeCompare(b.location ?? UNGROUPED);
      }
      return b.worth - a.worth; // value (total) desc
    });
    return arr;
  }, [filtered, sortKey]);

  // Group by room/location with per-room subtotals, ordered by subtotal desc.
  const groups = useMemo(() => {
    const map = new Map<string, InventoryItem[]>();
    for (const it of sorted) {
      const key = it.location?.trim() || UNGROUPED;
      const list = map.get(key);
      if (list) list.push(it);
      else map.set(key, [it]);
    }
    const out = [...map.entries()].map(([room, list]) => ({
      room,
      list,
      subtotal: list.reduce((s, it) => s + it.worth, 0),
      count: list.length,
    }));
    out.sort((a, b) => b.subtotal - a.subtotal);
    return out;
  }, [sorted]);

  function handleExportCsv() {
    const csv = buildCsv(sorted);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `inventory-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  const empty = items.length === 0;
  const noMatches = !empty && filtered.length === 0;

  return (
    <div className="space-y-6">
      <Hero worth={stats.worth} count={stats.count} units={stats.units} locations={stats.locations} />

      <AddItemForm />

      {!empty && (
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name, category or location…"
          className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-cyan-500/60 print:hidden"
        />
      )}

      {/* P2: category filter chips */}
      {categories.length > 0 && (
        <div className="flex flex-wrap gap-2 print:hidden">
          <button
            onClick={() => setActiveCategory(null)}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              activeCategory === null
                ? "bg-cyan-500 text-zinc-950"
                : "border border-zinc-700 text-zinc-300 hover:bg-zinc-800"
            }`}
          >
            All
          </button>
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setActiveCategory((cur) => (cur === c ? null : c))}
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                activeCategory === c
                  ? "bg-cyan-500 text-zinc-950"
                  : "border border-zinc-700 text-zinc-300 hover:bg-zinc-800"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      )}

      {/* P2/P3: sort, view toggle, export */}
      {!empty && (
        <div className="flex flex-wrap items-center gap-2 text-xs print:hidden">
          <span className="text-zinc-500">Sort</span>
          {(["value", "name", "room"] as SortKey[]).map((k) => (
            <button
              key={k}
              onClick={() => setSortKey(k)}
              className={`rounded-md px-2.5 py-1 capitalize ${
                sortKey === k ? "bg-zinc-700 text-zinc-100" : "text-zinc-400 hover:bg-zinc-800"
              }`}
            >
              {k}
            </button>
          ))}
          <span className="mx-1 h-4 w-px bg-zinc-700" />
          <button
            onClick={() => setViewMode((m) => (m === "list" ? "grid" : "list"))}
            className="rounded-md px-2.5 py-1 text-zinc-400 hover:bg-zinc-800"
          >
            {viewMode === "list" ? "▦ Photo grid" : "☰ List"}
          </button>
          <div className="ml-auto flex gap-2">
            <button
              onClick={handleExportCsv}
              className="rounded-md border border-zinc-700 px-2.5 py-1 text-zinc-300 hover:bg-zinc-800"
            >
              ↓ CSV
            </button>
            <button
              onClick={() => window.print()}
              className="rounded-md border border-zinc-700 px-2.5 py-1 text-zinc-300 hover:bg-zinc-800"
            >
              Print
            </button>
          </div>
        </div>
      )}

      {empty ? (
        <EmptyState />
      ) : noMatches ? (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 text-center text-sm text-zinc-400">
          No items match.
        </div>
      ) : viewMode === "grid" ? (
        <PhotoGrid items={sorted} />
      ) : (
        <div className="space-y-5">
          {groups.map((g) => (
            <div key={g.room} className="space-y-2">
              <div className="flex items-baseline justify-between border-b border-zinc-800 pb-1">
                <h2 className="text-sm font-semibold text-zinc-200">{g.room}</h2>
                <div className="text-xs text-zinc-500">
                  {g.count} {g.count === 1 ? "item" : "items"} · {formatMoney(g.subtotal)}
                </div>
              </div>
              <ul className="space-y-2">
                {g.list.map((it) => (
                  <ItemRow key={it.id} it={it} />
                ))}
              </ul>
            </div>
          ))}
        </div>
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

const inputCls =
  "w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-cyan-500/60";

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
        receiptUrl: String(formData.get("receiptUrl") || "").trim(),
        warrantyUrl: String(formData.get("warrantyUrl") || "").trim(),
      });
      formRef.current?.reset();
    });
  }

  return (
    <form
      ref={formRef}
      action={submit}
      className="space-y-2 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-3 print:hidden"
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
        <input name="location" autoComplete="off" placeholder="Room / location (optional)" className={`min-w-0 flex-1 ${inputCls}`} />
        <input name="category" autoComplete="off" placeholder="Category (optional)" className={`min-w-0 flex-1 ${inputCls}`} />
      </div>
      <input name="photoUrl" autoComplete="off" type="url" placeholder="Photo URL (optional, for proof of ownership)" className={inputCls} />
      <div className="flex flex-col gap-2 sm:flex-row">
        <input name="receiptUrl" autoComplete="off" type="url" placeholder="Receipt URL (optional)" className={`min-w-0 flex-1 ${inputCls}`} />
        <input name="warrantyUrl" autoComplete="off" type="url" placeholder="Warranty URL (optional)" className={`min-w-0 flex-1 ${inputCls}`} />
      </div>
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

function LinkChips({ it }: { it: InventoryItem }) {
  if (!it.receiptUrl && !it.warrantyUrl) return null;
  return (
    <div className="mt-1 flex gap-3">
      {it.receiptUrl && (
        <a href={it.receiptUrl} target="_blank" rel="noopener noreferrer" className="text-[11px] text-cyan-400 hover:underline">
          Receipt
        </a>
      )}
      {it.warrantyUrl && (
        <a href={it.warrantyUrl} target="_blank" rel="noopener noreferrer" className="text-[11px] text-cyan-400 hover:underline">
          Warranty
        </a>
      )}
    </div>
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
          <img src={it.photoUrl} alt="" className="h-10 w-10 shrink-0 rounded-lg border border-zinc-800 object-cover" />
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
            {it.category && <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-400">{it.category}</span>}
          </div>
          <LinkChips it={it} />
        </button>
        <div className="shrink-0 text-right">
          {it.value !== null ? (
            <>
              <div className="text-sm font-semibold tabular-nums text-cyan-300">{formatMoney(it.worth)}</div>
              {it.quantity > 1 && <div className="text-[10px] text-zinc-500">{formatMoney(it.value)} ea</div>}
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
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-800 hover:text-red-400 print:hidden"
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
        receiptUrl: String(formData.get("receiptUrl") || "").trim(),
        warrantyUrl: String(formData.get("warrantyUrl") || "").trim(),
      });
      onDone();
    });
  }

  return (
    <form action={submit} className="space-y-2 border-t border-zinc-800 px-3 py-3 print:hidden">
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
        <input name="location" defaultValue={it.location ?? ""} placeholder="Room / location" className={`min-w-0 flex-1 ${inputCls}`} />
        <input name="category" defaultValue={it.category ?? ""} placeholder="Category" className={`min-w-0 flex-1 ${inputCls}`} />
      </div>
      <input name="photoUrl" type="url" defaultValue={it.photoUrl ?? ""} placeholder="Photo URL" className={inputCls} />
      <div className="flex flex-col gap-2 sm:flex-row">
        <input name="receiptUrl" type="url" defaultValue={it.receiptUrl ?? ""} placeholder="Receipt URL" className={`min-w-0 flex-1 ${inputCls}`} />
        <input name="warrantyUrl" type="url" defaultValue={it.warrantyUrl ?? ""} placeholder="Warranty URL" className={`min-w-0 flex-1 ${inputCls}`} />
      </div>
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

function PhotoGrid({ items }: { items: InventoryItem[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {items.map((it) => (
        <div key={it.id} className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/40">
          {it.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={it.photoUrl} alt={it.name} className="aspect-square w-full object-cover" />
          ) : (
            <div className="flex aspect-square w-full items-center justify-center bg-zinc-900 text-3xl text-zinc-600">▦</div>
          )}
          <div className="p-2">
            <div className="truncate text-sm font-medium text-zinc-100">{it.name}</div>
            <div className="truncate text-xs text-zinc-500">
              {[it.category, it.location].filter(Boolean).join(" · ") || "—"}
            </div>
            <div className="mt-1 text-xs text-zinc-300">
              {it.value !== null ? formatMoney(it.worth) : "—"}
              <span className="text-zinc-600"> ×{it.quantity}</span>
            </div>
            <LinkChips it={it} />
          </div>
        </div>
      ))}
    </div>
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
