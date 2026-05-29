"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import type { Account, Snapshot } from "./page";
import { currency, currencyCompact } from "../_factories/factoryLib";
import {
  addAccount,
  deleteAccount,
  recordSnapshot,
  updateAccountValue,
} from "./actions";

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

  return (
    <div className="space-y-6">
      <Hero net={net} snapshots={snapshots} />

      <div className="grid grid-cols-3 gap-2">
        <Stat label="Assets" value={currencyCompact(assets)} tone="text-emerald-400" />
        <Stat label="Liabilities" value={currencyCompact(liabilities)} tone="text-rose-400" />
        <Stat
          label="Change"
          value={change === null ? "—" : `${change >= 0 ? "+" : ""}${currencyCompact(change)}`}
          tone={change === null ? "text-zinc-300" : change >= 0 ? "text-emerald-400" : "text-rose-400"}
        />
      </div>

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

function Hero({ net, snapshots }: { net: number; snapshots: Snapshot[] }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
      <div className="text-xs font-medium uppercase tracking-wider text-zinc-500">
        Net worth
      </div>
      <div
        className={`mt-1 text-4xl font-bold tabular-nums ${
          net >= 0 ? "text-cyan-400" : "text-rose-400"
        }`}
      >
        {currencyCompact(net)}
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

function Stat({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 px-3 py-3 text-center">
      <div className={`truncate text-base font-semibold tabular-nums ${tone}`} title={value}>
        {value}
      </div>
      <div className="mt-0.5 text-[10px] font-medium uppercase tracking-wider text-zinc-500">
        {label}
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
  return (
    <div>
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
