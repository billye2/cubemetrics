"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import type { Warranty, WarrantyStatus } from "./lib";
import { SOON_DAYS, statsFor } from "./lib";
import { Ring, StatStrip, StatTile, StatusPill, BucketSection } from "../_factories/FactoryUI";
import { addWarranty, deleteWarranty, setArchived, updateWarranty } from "./actions";

type Tone = "cyan" | "amber" | "emerald" | "rose" | "zinc";

const STATUS_TONE: Record<WarrantyStatus, Tone> = {
  expired: "rose",
  soon: "amber",
  active: "emerald",
};

const STATUS_LABEL: Record<WarrantyStatus, string> = {
  expired: "Expired",
  soon: "Expiring soon",
  active: "Active",
};

// Body buckets, most-urgent first. Soonest-to-expire gets the danger (rose) header.
const BUCKETS: { status: WarrantyStatus; danger?: boolean }[] = [
  { status: "soon", danger: true },
  { status: "active" },
  { status: "expired" },
];

const MONTH_OPTIONS = [
  { v: 3, label: "3 months" },
  { v: 6, label: "6 months" },
  { v: 12, label: "1 year" },
  { v: 24, label: "2 years" },
  { v: 36, label: "3 years" },
  { v: 60, label: "5 years" },
  { v: 120, label: "10 years" },
];

const STATUS_STYLE: Record<WarrantyStatus, { bar: string; text: string; badge: string }> = {
  expired: { bar: "bg-rose-500", text: "text-rose-300", badge: "bg-rose-500/15 text-rose-300" },
  soon: { bar: "bg-amber-500", text: "text-amber-300", badge: "bg-amber-500/15 text-amber-300" },
  active: { bar: "bg-emerald-500", text: "text-emerald-300", badge: "bg-emerald-500/15 text-emerald-300" },
};

function todayISO(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export function WarrantyView({
  warranties,
  archived,
}: {
  warranties: Warranty[];
  archived: Warranty[];
}) {
  const [showArchived, setShowArchived] = useState(false);
  const stats = useMemo(() => statsFor(warranties), [warranties]);

  return (
    <div className="space-y-6">
      <Hero stats={stats} />

      <StatStrip cols={3}>
        <StatTile label="Active" value={String(stats.active)} tone="emerald" />
        <StatTile label="Soon" value={String(stats.soon)} tone={stats.soon > 0 ? "amber" : "zinc"} />
        <StatTile label="Expired" value={String(stats.expired)} tone={stats.expired > 0 ? "rose" : "zinc"} />
      </StatStrip>

      <AddWarrantyForm />

      {warranties.length === 0 ? (
        <EmptyState />
      ) : (
        <div>
          {BUCKETS.map(({ status, danger }) => {
            const items = warranties.filter((w) => w.status === status);
            if (items.length === 0) return null;
            return (
              <BucketSection key={status} label={STATUS_LABEL[status]} count={items.length} danger={danger}>
                {items.map((w) => (
                  <WarrantyRow key={w.id} w={w} />
                ))}
              </BucketSection>
            );
          })}
        </div>
      )}

      {archived.length > 0 && (
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => setShowArchived((s) => !s)}
            className="text-xs font-medium text-zinc-500 hover:text-zinc-300"
          >
            {showArchived ? "▾" : "▸"} Archived ({archived.length})
          </button>
          {showArchived && (
            <ul className="space-y-2 opacity-70">
              {archived.map((w) => (
                <WarrantyRow key={w.id} w={w} />
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function Hero({ stats }: { stats: ReturnType<typeof statsFor> }) {
  // Time-to-expiry ring: share of tracked items still in coverage (active + soon).
  const covered = stats.active + stats.soon;
  const pct = stats.total > 0 ? covered / stats.total : 1;
  const tone: Tone = stats.soon > 0 ? "amber" : "emerald";
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
      <div className="flex items-center gap-4">
        <Ring pct={pct} size={72} stroke={8} tone={tone}>
          {stats.soon > 0 ? (
            <span className="text-lg font-bold tabular-nums text-amber-300">{stats.soon}</span>
          ) : (
            <span className="text-xl text-emerald-400">✓</span>
          )}
        </Ring>
        <div className="min-w-0 flex-1">
          <div className="text-xs font-medium uppercase tracking-wider text-zinc-500">
            {stats.soon > 0 ? `Expiring in the next ${SOON_DAYS} days` : "Coverage healthy"}
          </div>
          <p className="mt-0.5 text-sm text-zinc-300">
            {stats.total === 0
              ? "No warranties tracked yet."
              : stats.soon > 0
                ? `${stats.soon} need${stats.soon === 1 ? "s" : ""} attention soon.`
                : `Nothing expiring within ${SOON_DAYS} days.`}
          </p>
        </div>
      </div>
    </div>
  );
}

function AddWarrantyForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [months, setMonths] = useState(12);
  const [pending, start] = useTransition();

  function submit(formData: FormData) {
    const name = String(formData.get("name") || "").trim();
    const purchaseDate = String(formData.get("purchaseDate") || "");
    const store = String(formData.get("store") || "").trim();
    const note = String(formData.get("note") || "").trim();
    if (!name || !purchaseDate) return;
    start(async () => {
      await addWarranty({ name, purchaseDate, warrantyMonths: months, store, note });
      formRef.current?.reset();
      setMonths(12);
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
        placeholder="Product (e.g. Dishwasher)"
        className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-base text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-cyan-500/60"
      />
      <div className="flex flex-col gap-2 sm:flex-row">
        <label className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2">
          <span className="text-xs text-zinc-500">Bought</span>
          <input
            name="purchaseDate"
            type="date"
            defaultValue={todayISO()}
            max={todayISO()}
            className="min-w-0 flex-1 bg-transparent text-sm text-zinc-100 outline-none [color-scheme:dark]"
          />
        </label>
        <label className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2">
          <span className="text-xs text-zinc-500">Covers</span>
          <select
            value={months}
            onChange={(e) => setMonths(Number(e.target.value))}
            className="flex-1 bg-transparent text-sm text-zinc-200 outline-none"
          >
            {MONTH_OPTIONS.map((o) => (
              <option key={o.v} value={o.v} className="bg-zinc-900">
                {o.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          name="store"
          autoComplete="off"
          placeholder="Store / vendor (optional)"
          className="min-w-0 flex-1 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-cyan-500/60"
        />
        <input
          name="note"
          autoComplete="off"
          placeholder="Receipt / note (optional)"
          className="min-w-0 flex-1 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-cyan-500/60"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="min-h-[44px] w-full rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-cyan-400 disabled:opacity-50"
      >
        Add warranty
      </button>
    </form>
  );
}

function WarrantyRow({ w }: { w: Warranty }) {
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const style = STATUS_STYLE[w.status];

  const options = [...MONTH_OPTIONS];
  if (!options.some((o) => o.v === w.warrantyMonths)) {
    options.unshift({ v: w.warrantyMonths, label: `${w.warrantyMonths} months` });
  }

  function remove() {
    if (!confirm(`Delete the warranty for ${w.name}?`)) return;
    start(() => deleteWarranty(w.id));
  }

  return (
    <li
      className={`rounded-xl border border-zinc-800 bg-zinc-900/40 ${pending ? "opacity-50" : ""}`}
    >
      <div className="flex items-center gap-3 py-3 pl-3 pr-2">
        <span className={`h-9 w-1 shrink-0 rounded-full ${style.bar}`} aria-hidden />
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="min-w-0 flex-1 text-left"
        >
          <div className="flex flex-wrap items-baseline gap-x-2">
            <span className="break-words text-sm font-medium text-zinc-100">{w.name}</span>
            {w.store && <span className="text-xs text-zinc-500">{w.store}</span>}
          </div>
          <div className="mt-0.5 flex items-center gap-2">
            <StatusPill label={STATUS_LABEL[w.status]} tone={STATUS_TONE[w.status]} />
            <span className={`text-xs ${style.text}`}>{w.label}</span>
          </div>
        </button>
        <button
          type="button"
          onClick={() => start(() => setArchived(w.id, !w.archived))}
          disabled={pending}
          aria-label={w.archived ? "Unarchive" : "Archive"}
          title={w.archived ? "Unarchive" : "Archive"}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-800 hover:text-cyan-300"
        >
          <span className="text-sm leading-none">{w.archived ? "↺" : "⌂"}</span>
        </button>
        <button
          type="button"
          onClick={remove}
          disabled={pending}
          aria-label="Delete warranty"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-800 hover:text-red-400"
        >
          <span className="text-lg leading-none">×</span>
        </button>
      </div>

      {open && (
        <div className="space-y-2 border-t border-zinc-800 px-4 py-3 text-xs text-zinc-400">
          <div className="flex justify-between">
            <span>Purchased</span>
            <span className="tabular-nums text-zinc-300">{w.purchaseDate}</span>
          </div>
          <div className="flex justify-between">
            <span>Expires</span>
            <span className="tabular-nums text-zinc-300">{w.expiry}</span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span>Coverage</span>
            <select
              aria-label={`Coverage length for ${w.name}`}
              value={w.warrantyMonths}
              onChange={(e) => start(() => updateWarranty(w.id, { warrantyMonths: Number(e.target.value) }))}
              disabled={pending}
              className="rounded-lg border border-zinc-700 bg-zinc-900 px-1.5 py-1 text-xs text-zinc-300 outline-none focus:border-cyan-500"
            >
              {options.map((o) => (
                <option key={o.v} value={o.v}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          {w.note && (
            <div className="flex justify-between gap-4">
              <span>Note</span>
              <span className="break-words text-right text-zinc-300">{w.note}</span>
            </div>
          )}
        </div>
      )}
    </li>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-8 text-center">
      <div className="text-3xl text-zinc-600">☖</div>
      <p className="mt-2 text-sm text-zinc-300">No warranties tracked yet.</p>
      <p className="text-xs text-zinc-500">
        Add a purchase with its coverage length and we&apos;ll warn you before it expires.
      </p>
    </div>
  );
}
