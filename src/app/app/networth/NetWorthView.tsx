"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import type { Account, Snapshot } from "./page";
import { currency, currencyCompact, hexAlpha } from "../_factories/factoryLib";
import { Ring, StatStrip, StatTile } from "../_factories/FactoryUI";
import {
  addAccount,
  deleteAccount,
  recordSnapshot,
  updateAccountValue,
} from "./actions";

const EMERALD = "#34d399";
const ROSE = "#fb7185";

export function NetWorthView({
  accounts,
  snapshots,
}: {
  accounts: Account[];
  snapshots: Snapshot[];
}) {
  const assets = sum(accounts.filter((a) => a.kind !== "liability"));
  const liabilities = sum(accounts.filter((a) => a.kind === "liability"));
  const net = assets - liabilities;

  const lastSnap = snapshots.length ? snapshots[snapshots.length - 1].net : null;
  const change = lastSnap === null ? null : net - lastSnap;

  // Equity ring: what share of total assets you actually own (assets − liabilities).
  const equity = assets > 0 ? Math.max(0, Math.min(1, net / assets)) : net >= 0 ? 1 : 0;

  return (
    <div className="space-y-6">
      <Hero net={net} equity={equity} assets={assets} liabilities={liabilities} snapshots={snapshots} />

      <StatStrip cols={3}>
        <StatTile label="Assets" value={currencyCompact(assets)} tone="emerald" />
        <StatTile label="Liabilities" value={currencyCompact(liabilities)} tone="rose" />
        <StatTile
          label="Change"
          value={change === null ? "—" : `${change >= 0 ? "+" : ""}${currencyCompact(change)}`}
          tone={change === null ? "zinc" : change >= 0 ? "emerald" : "rose"}
        />
      </StatStrip>

      <SnapshotButton hasAccounts={accounts.length > 0} />

      <AddAccountForm />

      <Section
        title="Assets"
        kind="asset"
        accounts={accounts.filter((a) => a.kind !== "liability")}
      />
      <Section
        title="Liabilities"
        kind="liability"
        accounts={accounts.filter((a) => a.kind === "liability")}
      />
    </div>
  );
}

function sum(accounts: Account[]): number {
  return accounts.reduce((acc, a) => acc + (a.value || 0), 0);
}

function Hero({
  net,
  equity,
  assets,
  liabilities,
  snapshots,
}: {
  net: number;
  equity: number;
  assets: number;
  liabilities: number;
  snapshots: Snapshot[];
}) {
  const tone = net >= 0 ? "emerald" : "rose";
  const caption =
    assets === 0 && liabilities === 0
      ? "Add accounts to begin"
      : liabilities === 0
        ? "Debt-free 🎉"
        : net < 0
          ? "underwater"
          : `${Math.round(equity * 100)}% equity`;
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
      <div className="flex items-center gap-4">
        <Ring pct={equity} size={72} stroke={8} tone={tone}>
          <span className="text-sm font-bold tabular-nums text-zinc-200">
            {Math.round(equity * 100)}%
          </span>
        </Ring>
        <div className="min-w-0 flex-1">
          <div className="text-xs font-medium uppercase tracking-wider text-zinc-500">
            Net worth
          </div>
          <div
            className={`mt-0.5 text-4xl font-bold tabular-nums ${
              net >= 0 ? "text-cyan-400" : "text-rose-400"
            }`}
          >
            {currencyCompact(net)}
          </div>
          <div className="mt-0.5 text-[11px] text-zinc-500">{caption}</div>
        </div>
      </div>
      <TrendLine snapshots={snapshots} />
    </div>
  );
}

function TrendLine({ snapshots }: { snapshots: Snapshot[] }) {
  if (snapshots.length < 2) {
    return (
      <p className="mt-3 text-xs text-zinc-500">
        {snapshots.length === 0
          ? "Record a snapshot to start the trend."
          : "One snapshot so far — record another to see the trend."}
      </p>
    );
  }
  const nets = snapshots.map((s) => s.net);
  const min = Math.min(...nets);
  const max = Math.max(...nets);
  const span = max - min || 1;
  const n = nets.length;
  const pts = nets
    .map((v, i) => {
      const x = (i / (n - 1)) * 100;
      const y = 38 - ((v - min) / span) * 36; // 2..38 within a 40 viewBox
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");

  return (
    <div className="mt-3">
      <svg
        viewBox="0 0 100 40"
        preserveAspectRatio="none"
        className="h-16 w-full"
        aria-hidden
      >
        <polyline
          points={pts}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="text-cyan-500"
          vectorEffect="non-scaling-stroke"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>
      <div className="mt-1 flex justify-between text-[10px] text-zinc-600">
        <span>{snapshots[0].captured_on}</span>
        <span>{snapshots[snapshots.length - 1].captured_on}</span>
      </div>
    </div>
  );
}

function SnapshotButton({ hasAccounts }: { hasAccounts: boolean }) {
  const [pending, start] = useTransition();
  if (!hasAccounts) return null;
  return (
    <button
      type="button"
      onClick={() => start(() => recordSnapshot())}
      disabled={pending}
      className="min-h-[44px] w-full rounded-xl border border-cyan-500/40 bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-300 hover:bg-cyan-500/20 disabled:opacity-50"
    >
      {pending ? "Recording…" : "Record snapshot"}
    </button>
  );
}

function AddAccountForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [kind, setKind] = useState<"asset" | "liability">("asset");
  const [pending, start] = useTransition();

  function submit(formData: FormData) {
    const name = String(formData.get("name") || "").trim();
    const value = Number(formData.get("value") || 0);
    if (!name) return;
    start(async () => {
      await addAccount(name, kind, value);
      formRef.current?.reset();
    });
  }

  return (
    <form
      ref={formRef}
      action={submit}
      className="space-y-2 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-3"
    >
      <div className="flex gap-1.5">
        {(["asset", "liability"] as const).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setKind(k)}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium capitalize ${
              kind === k
                ? k === "asset"
                  ? "bg-emerald-500/20 text-emerald-300"
                  : "bg-rose-500/20 text-rose-300"
                : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
            }`}
          >
            {k}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          name="name"
          autoComplete="off"
          placeholder={kind === "asset" ? "Account (e.g. Checking)" : "Debt (e.g. Car loan)"}
          className="min-w-0 flex-1 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-base text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-cyan-500/60"
        />
        <input
          name="value"
          type="number"
          step="0.01"
          inputMode="decimal"
          placeholder="0"
          aria-label="Value"
          className="w-28 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-right text-base text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-cyan-500/60"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="min-h-[44px] w-full rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-cyan-400 disabled:opacity-50"
      >
        Add {kind}
      </button>
    </form>
  );
}

function Section({
  title,
  kind,
  accounts,
}: {
  title: string;
  kind: "asset" | "liability";
  accounts: Account[];
}) {
  const total = sum(accounts);
  const hue = kind === "asset" ? EMERALD : ROSE;
  return (
    <div
      className="rounded-2xl border p-4"
      style={{ background: hexAlpha(hue, 0.04), borderColor: hexAlpha(hue, 0.2) }}
    >
      <div className="mb-2 flex items-baseline justify-between">
        <h3 className="text-sm font-semibold text-zinc-100">{title}</h3>
        <span
          className={`text-sm font-semibold tabular-nums ${
            kind === "asset" ? "text-emerald-400" : "text-rose-400"
          }`}
        >
          {currency(total)}
        </span>
      </div>
      {accounts.length === 0 ? (
        <p className="rounded-xl border border-dashed border-zinc-800 px-3 py-2 text-xs text-zinc-600">
          No {title.toLowerCase()} yet.
        </p>
      ) : (
        <ul className="space-y-2">
          {accounts.map((a) => (
            <AccountRow key={a.id} account={a} />
          ))}
        </ul>
      )}
    </div>
  );
}

function AccountRow({ account }: { account: Account }) {
  const [pending, start] = useTransition();
  const [value, setValue] = useState(String(account.value));

  useEffect(() => setValue(String(account.value)), [account.value]);

  function save() {
    const v = Number(value);
    if (!Number.isFinite(v) || v === account.value) {
      setValue(String(account.value));
      return;
    }
    start(() => updateAccountValue(account.id, v));
  }

  function remove() {
    if (!confirm(`Delete "${account.name}"?`)) return;
    start(() => deleteAccount(account.id));
  }

  return (
    <li
      className={`flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/40 px-3 py-2.5 ${
        pending ? "opacity-50" : ""
      }`}
    >
      <span className="min-w-0 flex-1 break-words text-sm text-zinc-100">{account.name}</span>
      <input
        type="number"
        step="0.01"
        inputMode="decimal"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        }}
        aria-label={`Value of ${account.name}`}
        className="w-28 rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-1.5 text-right text-sm tabular-nums text-zinc-100 outline-none focus:border-cyan-500"
      />
      <button
        type="button"
        onClick={remove}
        disabled={pending}
        aria-label="Delete account"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-800 hover:text-red-400"
      >
        <span className="text-lg leading-none">×</span>
      </button>
    </li>
  );
}
