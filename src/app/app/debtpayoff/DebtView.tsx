"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { currency, currencyCompact, shortDate } from "../_factories/factoryLib";
import {
  addPayment,
  createDebt,
  deleteDebt,
  deletePayment,
  updateDebt,
} from "./actions";
import {
  debtTimeline,
  monthKeyLabel,
  monthLabel,
  orderByStrategy,
  paidOffInfo,
  portfolioProjectionTimeline,
  portfolioTimeline,
  portfolioTotals,
  projectionTimeline,
  statsFor,
  type BalancePoint,
  type DebtRow,
  type PaymentRow,
  type Strategy,
} from "./lib";

export function DebtView({
  debts,
  payments,
}: {
  debts: DebtRow[];
  payments: PaymentRow[];
}) {
  const [strategy, setStrategy] = useState<Strategy>("avalanche");
  // Interest accrual: when on, projections compound APR/12 each month so the
  // forward burn-down tracks realistically (off = straight-line on principal).
  const [accrue, setAccrue] = useState(true);

  const byDebt = useMemo(() => {
    const m = new Map<number, PaymentRow[]>();
    for (const p of payments) {
      const list = m.get(p.debt_id) ?? [];
      list.push(p);
      m.set(p.debt_id, list);
    }
    return m;
  }, [payments]);

  const totals = useMemo(
    () => portfolioTotals(debts, byDebt),
    [debts, byDebt]
  );

  // Active debts in strategy order; the first is the "focus" debt (send extra here).
  const ordered = useMemo(() => {
    const active = debts
      .map((d) => ({
        debt: d,
        balance: statsFor(d, byDebt.get(d.id) ?? []).balance,
      }))
      .filter((x) => x.balance > 0);
    const order = orderByStrategy(
      active.map((x) => ({ id: x.debt.id, balance: x.balance, apr: x.debt.apr })),
      strategy
    );
    return order.map((o) => debts.find((d) => d.id === o.id)!).filter(Boolean);
  }, [debts, byDebt, strategy]);

  const focusId = ordered[0]?.id ?? null;
  const paidDebts = useMemo(
    () =>
      debts.filter((d) => statsFor(d, byDebt.get(d.id) ?? []).complete),
    [debts, byDebt]
  );

  // Portfolio total-owed over time: real history, then dashed forward projection.
  const history = useMemo(
    () => portfolioTimeline(debts, byDebt),
    [debts, byDebt]
  );
  const projection = useMemo(
    () => portfolioProjectionTimeline(debts, byDebt, accrue),
    [debts, byDebt, accrue]
  );

  // Celebration: every debt is cleared (and there's at least one).
  const allClear = debts.length > 0 && totals.activeCount === 0;

  return (
    <div className="space-y-6">
      {allClear && <DebtFreeBanner count={totals.paidCount} />}

      <PortfolioHero totals={totals} />

      {(history.length >= 2 || projection.length >= 2) && (
        <PortfolioChart
          history={history}
          projection={projection}
          accrue={accrue}
          onToggleAccrue={() => setAccrue((v) => !v)}
        />
      )}

      {totals.activeCount > 1 && (
        <StrategyPicker
          strategy={strategy}
          onChange={setStrategy}
          focus={ordered[0] ?? null}
        />
      )}

      <NewDebtForm />

      {debts.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-zinc-800 px-4 py-6 text-center text-sm text-zinc-500">
          No debts yet. Add one above to start tracking payoff.
        </p>
      ) : (
        <ul className="space-y-4">
          {ordered.map((d) => (
            <DebtCard
              key={d.id}
              debt={d}
              payments={byDebt.get(d.id) ?? []}
              isFocus={d.id === focusId && totals.activeCount > 1}
              accrue={accrue}
            />
          ))}
        </ul>
      )}

      {paidDebts.length > 0 && (
        <PaidOffArchive debts={paidDebts} byDebt={byDebt} />
      )}
    </div>
  );
}

// ── P3: celebration ───────────────────────────────────────────────────────────

function DebtFreeBanner({ count }: { count: number }) {
  return (
    <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-5 text-center">
      <div className="text-3xl" aria-hidden>
        🎉🥳🎊
      </div>
      <div className="mt-2 text-lg font-bold text-emerald-300">
        You&apos;re debt-free!
      </div>
      <div className="mt-1 text-xs text-emerald-200/70">
        All {count} {count === 1 ? "debt" : "debts"} paid off. Nicely done.
      </div>
    </div>
  );
}

// ── P3: portfolio total-owed chart (history + dashed projection) ──────────────

function PortfolioChart({
  history,
  projection,
  accrue,
  onToggleAccrue,
}: {
  history: BalancePoint[];
  projection: BalancePoint[];
  accrue: boolean;
  onToggleAccrue: () => void;
}) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs font-medium uppercase tracking-wider text-zinc-500">
          Total owed over time
        </div>
        <button
          type="button"
          onClick={onToggleAccrue}
          aria-pressed={accrue}
          className={`min-h-[28px] rounded-full px-3 py-1 text-[11px] font-semibold ${
            accrue
              ? "bg-cyan-500/15 text-cyan-300"
              : "border border-zinc-700 text-zinc-400 hover:bg-zinc-800"
          }`}
        >
          {accrue ? "interest: on" : "interest: off"}
        </button>
      </div>
      <BalanceChart history={history} projection={projection} />
      <p className="mt-2 text-[11px] text-zinc-600">
        Solid = paid history. Dashed = projected payoff at current minimums
        {accrue ? ", accruing APR each month" : " (principal only)"}.
      </p>
    </div>
  );
}

/**
 * SVG line of balance over months. Draws the solid history first, then a dashed
 * projection that begins where history ends. Both share one Y scale so the line
 * is continuous. Phone-first: fixed viewBox, non-scaling stroke.
 */
function BalanceChart({
  history,
  projection,
}: {
  history: BalancePoint[];
  projection: BalancePoint[];
}) {
  // Stitch the two series on a shared month axis. Projection's first point is
  // "now", which may overlap history's last month — drop the duplicate so the
  // dashed line continues from the solid one without a flat backtrack.
  const proj =
    history.length > 0 && projection.length > 0 &&
    projection[0].month <= history[history.length - 1].month
      ? projection.slice(1)
      : projection;

  const all = [...history, ...proj];
  if (all.length < 2) return null;

  const values = all.map((p) => p.balance);
  const max = Math.max(...values, 1);
  const min = 0;
  const span = max - min || 1;
  const n = all.length;

  const xy = (i: number, balance: number) => {
    const x = (i / (n - 1)) * 100;
    const y = 38 - ((balance - min) / span) * 36; // 2..38 in a 40 viewBox
    return [x, y] as const;
  };

  const histPts = history
    .map((p, i) => {
      const [x, y] = xy(i, p.balance);
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");

  // Projection picks up at the index right after the last history point.
  const projStartIdx = history.length - 1;
  const projPtsArr = proj.map((p, k) => {
    const [x, y] = xy(projStartIdx + 1 + k, p.balance);
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });
  // Bridge from the last history point into the projection so there's no gap.
  if (history.length > 0 && projPtsArr.length > 0) {
    const [hx, hy] = xy(projStartIdx, history[history.length - 1].balance);
    projPtsArr.unshift(`${hx.toFixed(2)},${hy.toFixed(2)}`);
  }

  const firstLabel = all[0]?.month;
  const lastLabel = all[all.length - 1]?.month;

  return (
    <div className="mt-3">
      <svg
        viewBox="0 0 100 40"
        preserveAspectRatio="none"
        className="h-20 w-full"
        aria-hidden
      >
        {history.length >= 2 && (
          <polyline
            points={histPts}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className="text-cyan-500"
            vectorEffect="non-scaling-stroke"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        )}
        {projPtsArr.length >= 2 && (
          <polyline
            points={projPtsArr.join(" ")}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeDasharray="3 2"
            className="text-cyan-400/60"
            vectorEffect="non-scaling-stroke"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        )}
      </svg>
      <div className="mt-1 flex justify-between text-[10px] text-zinc-600">
        <span>{firstLabel ? monthKeyLabel(firstLabel) : ""}</span>
        <span>{lastLabel ? monthKeyLabel(lastLabel) : ""}</span>
      </div>
    </div>
  );
}

// ── P3: paid-off archive ──────────────────────────────────────────────────────

function PaidOffArchive({
  debts,
  byDebt,
}: {
  debts: DebtRow[];
  byDebt: Map<number, PaymentRow[]>;
}) {
  return (
    <div className="space-y-3">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-emerald-300">
        <span aria-hidden>🎉</span> Paid off
        <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
          {debts.length}
        </span>
      </h2>
      <ul className="space-y-3">
        {debts.map((d) => (
          <ArchiveCard key={d.id} debt={d} payments={byDebt.get(d.id) ?? []} />
        ))}
      </ul>
    </div>
  );
}

function ArchiveCard({
  debt,
  payments,
}: {
  debt: DebtRow;
  payments: PaymentRow[];
}) {
  const [editing, setEditing] = useState(false);
  const info = useMemo(() => paidOffInfo(debt, payments), [debt, payments]);

  return (
    <li className="rounded-2xl border border-emerald-500/30 bg-emerald-500/[0.04] p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span aria-hidden className="text-base">
              ✓
            </span>
            <h3 className="break-words text-base font-semibold text-zinc-100">
              {debt.name}
            </h3>
          </div>
          <div className="mt-0.5 text-sm tabular-nums text-zinc-400">
            <span className="font-semibold text-emerald-300">
              {currency(info.cleared)}
            </span>{" "}
            cleared
            {info.paidOn && (
              <>
                {" "}
                · paid off{" "}
                <span className="text-zinc-300">{shortDate(info.paidOn)}</span>
              </>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={() => setEditing((v) => !v)}
          aria-label="Edit debt"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
        >
          <span className="text-sm">{editing ? "×" : "⋯"}</span>
        </button>
      </div>
      {editing ? (
        <EditDebtForm debt={debt} onDone={() => setEditing(false)} />
      ) : (
        <PaymentLog debtId={debt.id} payments={payments} />
      )}
    </li>
  );
}

function PortfolioHero({
  totals,
}: {
  totals: ReturnType<typeof portfolioTotals>;
}) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
      <div className="text-xs font-medium uppercase tracking-wider text-zinc-500">
        Total owed
      </div>
      <div className="mt-1 text-4xl font-bold tabular-nums text-cyan-400">
        {currencyCompact(totals.totalBalance)}
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500">
        {totals.activeCount > 0 && (
          <span>
            <span className="font-semibold text-zinc-300">
              {totals.activeCount}
            </span>{" "}
            active
          </span>
        )}
        {totals.paidCount > 0 && (
          <span>
            <span className="font-semibold text-emerald-300">
              {totals.paidCount}
            </span>{" "}
            paid off
          </span>
        )}
        {totals.totalPaid > 0 && (
          <span>
            <span className="font-semibold text-zinc-300">
              {currency(totals.totalPaid)}
            </span>{" "}
            paid to date
          </span>
        )}
        {totals.combinedMinimums > 0 && (
          <span>
            <span className="font-semibold text-zinc-300">
              {currency(totals.combinedMinimums)}
            </span>
            /mo minimums
          </span>
        )}
        {totals.debtFreeMonth && (
          <span>
            debt-free{" "}
            <span className="font-semibold text-emerald-300">
              {monthLabel(totals.debtFreeMonth)}
            </span>
          </span>
        )}
      </div>
    </div>
  );
}

function StrategyPicker({
  strategy,
  onChange,
  focus,
}: {
  strategy: Strategy;
  onChange: (s: Strategy) => void;
  focus: DebtRow | null;
}) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onChange("avalanche")}
          className={`min-h-[44px] flex-1 rounded-xl px-3 py-2 text-sm font-semibold ${
            strategy === "avalanche"
              ? "bg-cyan-500 text-zinc-950"
              : "border border-zinc-800 text-zinc-300 hover:bg-zinc-800"
          }`}
        >
          Avalanche
        </button>
        <button
          type="button"
          onClick={() => onChange("snowball")}
          className={`min-h-[44px] flex-1 rounded-xl px-3 py-2 text-sm font-semibold ${
            strategy === "snowball"
              ? "bg-cyan-500 text-zinc-950"
              : "border border-zinc-800 text-zinc-300 hover:bg-zinc-800"
          }`}
        >
          Snowball
        </button>
      </div>
      <p className="mt-2 text-[11px] text-zinc-500">
        {strategy === "avalanche"
          ? "Highest APR first — pays the least interest overall."
          : "Smallest balance first — quick wins to build momentum."}
      </p>
      {focus && (
        <p className="mt-2 text-xs text-zinc-400">
          Send any extra beyond minimums to{" "}
          <span className="font-semibold text-cyan-300">{focus.name}</span>.
        </p>
      )}
    </div>
  );
}

function DebtCard({
  debt,
  payments,
  isFocus,
  accrue,
}: {
  debt: DebtRow;
  payments: PaymentRow[];
  isFocus: boolean;
  accrue: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const stats = useMemo(() => statsFor(debt, payments), [debt, payments]);
  const pct = Math.round(stats.fraction * 100);
  const proj = stats.projection;

  // Per-debt burn-down: real payment history (solid) + projected payoff (dashed).
  const history = useMemo(
    () => debtTimeline(debt.original_balance, payments),
    [debt.original_balance, payments]
  );
  const forward = useMemo(
    () =>
      stats.complete
        ? []
        : projectionTimeline(stats.balance, debt.apr, debt.min_payment, accrue),
    [stats.complete, stats.balance, debt.apr, debt.min_payment, accrue]
  );

  return (
    <li
      className={`rounded-2xl border bg-zinc-900/40 p-4 ${
        isFocus ? "border-cyan-500/50 ring-1 ring-cyan-500/20" : "border-zinc-800"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="break-words text-base font-semibold text-zinc-100">
              {debt.name}
            </h3>
            {isFocus && (
              <span className="shrink-0 rounded-full bg-cyan-500/15 px-2 py-0.5 text-[10px] font-semibold text-cyan-300">
                focus
              </span>
            )}
          </div>
          <div className="mt-0.5 text-sm tabular-nums text-zinc-400">
            <span className="font-semibold text-cyan-300">
              {currency(stats.balance)}
            </span>{" "}
            left of {currency(debt.original_balance)}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {stats.complete && (
            <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
              paid off
            </span>
          )}
          <button
            type="button"
            onClick={() => setEditing((v) => !v)}
            aria-label="Edit debt"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
          >
            <span className="text-sm">{editing ? "×" : "⋯"}</span>
          </button>
        </div>
      </div>

      {/* Paid-down bar: fills toward zero balance. */}
      <div className="mt-3">
        <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
          <div
            className={`h-full rounded-full ${
              stats.complete ? "bg-emerald-500" : "bg-cyan-500"
            }`}
            style={{ width: `${Math.min(100, pct)}%` }}
          />
        </div>
        <div className="mt-1 flex justify-between text-[11px] text-zinc-500">
          <span>{pct}% paid down</span>
          <span>
            {debt.apr > 0 ? `${debt.apr}% APR` : "0% APR"}
            {debt.min_payment > 0 && ` · ${currency(debt.min_payment)}/mo min`}
          </span>
        </div>
      </div>

      {!stats.complete && (
        <ProjectionRow projection={proj} minPayment={debt.min_payment} />
      )}

      {(history.length >= 2 || forward.length >= 2) && (
        <BalanceChart history={history} projection={forward} />
      )}

      {editing ? (
        <EditDebtForm debt={debt} onDone={() => setEditing(false)} />
      ) : (
        <>
          {!stats.complete && <AddPaymentForm debtId={debt.id} />}
          <PaymentLog debtId={debt.id} payments={payments} />
        </>
      )}
    </li>
  );
}

function ProjectionRow({
  projection,
  minPayment,
}: {
  projection: ReturnType<typeof statsFor>["projection"];
  minPayment: number;
}) {
  const bits: React.ReactNode[] = [];

  if (projection.neverPaysOff) {
    bits.push(
      <span key="never" className="font-semibold text-rose-400">
        payment too low to cover interest
      </span>
    );
  } else if (projection.months !== null && projection.months > 0) {
    const m = projection.months;
    const yrs = Math.floor(m / 12);
    const rem = m % 12;
    const dur =
      yrs > 0 ? `${yrs}y${rem > 0 ? ` ${rem}mo` : ""}` : `${m} mo`;
    bits.push(<span key="months">{dur} to payoff</span>);
    if (projection.payoffMonth) {
      bits.push(
        <span key="date" className="font-semibold text-emerald-300">
          debt-free {monthLabel(projection.payoffMonth)}
        </span>
      );
    }
    if (projection.totalInterest !== null && projection.totalInterest > 0) {
      bits.push(
        <span key="int">{currency(projection.totalInterest)} interest</span>
      );
    }
  } else if (minPayment <= 0) {
    bits.push(
      <span key="nomin" className="text-zinc-500">
        set a minimum payment to project payoff
      </span>
    );
  }

  if (bits.length === 0) return null;
  return (
    <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-zinc-400">
      {bits}
    </div>
  );
}

function NewDebtForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();

  function submit(formData: FormData) {
    const name = String(formData.get("name") || "").trim();
    const balance = Number(formData.get("balance") || 0);
    const apr = Number(formData.get("apr") || 0);
    const min = Number(formData.get("min") || 0);
    if (!name) return;
    start(async () => {
      await createDebt(name, balance, apr, min);
      formRef.current?.reset();
      setOpen(false);
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="min-h-[44px] w-full rounded-xl border border-cyan-500/40 bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-300 hover:bg-cyan-500/20"
      >
        + New debt
      </button>
    );
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
        autoFocus
        placeholder="Debt (e.g. Visa card)"
        className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-base text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-cyan-500/60"
      />
      <div className="flex gap-2">
        <input
          name="balance"
          type="number"
          step="0.01"
          min="0"
          inputMode="decimal"
          placeholder="Balance $"
          aria-label="Current balance"
          className="min-w-0 flex-1 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-right text-base tabular-nums text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-cyan-500/60"
        />
        <input
          name="apr"
          type="number"
          step="0.01"
          min="0"
          inputMode="decimal"
          placeholder="APR %"
          aria-label="APR percent"
          className="w-24 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-right text-base tabular-nums text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-cyan-500/60"
        />
        <input
          name="min"
          type="number"
          step="0.01"
          min="0"
          inputMode="decimal"
          placeholder="Min $/mo"
          aria-label="Minimum monthly payment"
          className="w-28 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-right text-base tabular-nums text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-cyan-500/60"
        />
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="min-h-[44px] flex-1 rounded-lg border border-zinc-800 px-4 py-2 text-sm font-medium text-zinc-400 hover:bg-zinc-800"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={pending}
          className="min-h-[44px] flex-[2] rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-cyan-400 disabled:opacity-50"
        >
          {pending ? "Adding…" : "Add debt"}
        </button>
      </div>
    </form>
  );
}

function EditDebtForm({ debt, onDone }: { debt: DebtRow; onDone: () => void }) {
  const [pending, start] = useTransition();

  function submit(formData: FormData) {
    const name = String(formData.get("name") || "").trim();
    const balance = Number(formData.get("balance") || 0);
    const apr = Number(formData.get("apr") || 0);
    const min = Number(formData.get("min") || 0);
    if (!name) return;
    start(async () => {
      await updateDebt(debt.id, name, balance, apr, min);
      onDone();
    });
  }

  function remove() {
    if (!confirm(`Delete "${debt.name}" and all its payments?`)) return;
    start(async () => {
      await deleteDebt(debt.id);
    });
  }

  return (
    <form
      action={submit}
      className="mt-3 space-y-2 rounded-xl border border-zinc-800 bg-zinc-900/60 p-3"
    >
      <input
        name="name"
        autoComplete="off"
        defaultValue={debt.name}
        placeholder="Debt name"
        className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-base text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-cyan-500/60"
      />
      <div className="flex gap-2">
        <input
          name="balance"
          type="number"
          step="0.01"
          min="0"
          inputMode="decimal"
          defaultValue={debt.original_balance || ""}
          placeholder="Original balance $"
          aria-label="Original balance"
          className="min-w-0 flex-1 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-right text-base tabular-nums text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-cyan-500/60"
        />
        <input
          name="apr"
          type="number"
          step="0.01"
          min="0"
          inputMode="decimal"
          defaultValue={debt.apr || ""}
          placeholder="APR %"
          aria-label="APR percent"
          className="w-24 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-right text-base tabular-nums text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-cyan-500/60"
        />
        <input
          name="min"
          type="number"
          step="0.01"
          min="0"
          inputMode="decimal"
          defaultValue={debt.min_payment || ""}
          placeholder="Min $/mo"
          aria-label="Minimum monthly payment"
          className="w-28 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-right text-base tabular-nums text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-cyan-500/60"
        />
      </div>
      <p className="text-[11px] text-zinc-600">
        Balance left is original minus logged payments.
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={remove}
          disabled={pending}
          className="min-h-[44px] rounded-lg border border-rose-500/40 px-4 py-2 text-sm font-medium text-rose-300 hover:bg-rose-500/10 disabled:opacity-50"
        >
          Delete
        </button>
        <button
          type="submit"
          disabled={pending}
          className="min-h-[44px] flex-1 rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-cyan-400 disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save"}
        </button>
      </div>
    </form>
  );
}

function AddPaymentForm({ debtId }: { debtId: number }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, start] = useTransition();

  function submit(formData: FormData) {
    const amount = Number(formData.get("amount") || 0);
    const date = String(formData.get("date") || "") || null;
    const note = String(formData.get("note") || "");
    if (!Number.isFinite(amount) || amount <= 0) return;
    start(async () => {
      await addPayment(debtId, amount, date, note);
      formRef.current?.reset();
    });
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <form ref={formRef} action={submit} className="mt-3 space-y-2">
      <div className="flex gap-2">
        <input
          name="amount"
          type="number"
          step="0.01"
          min="0"
          inputMode="decimal"
          placeholder="Payment $"
          aria-label="Payment amount"
          className="w-28 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-right text-base tabular-nums text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-cyan-500/60"
        />
        <input
          name="date"
          type="date"
          defaultValue={today}
          aria-label="Payment date"
          className="min-w-0 flex-1 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-base text-zinc-100 outline-none focus:border-cyan-500/60"
        />
      </div>
      <div className="flex gap-2">
        <input
          name="note"
          autoComplete="off"
          placeholder="Note (optional)"
          className="min-w-0 flex-1 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-base text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-cyan-500/60"
        />
        <button
          type="submit"
          disabled={pending}
          className="min-h-[44px] shrink-0 rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-cyan-400 disabled:opacity-50"
        >
          {pending ? "…" : "+ Pay"}
        </button>
      </div>
    </form>
  );
}

function PaymentLog({
  debtId,
  payments,
}: {
  debtId: number;
  payments: PaymentRow[];
}) {
  if (payments.length === 0) {
    return <p className="mt-3 text-xs text-zinc-600">No payments yet.</p>;
  }
  return (
    <ul className="mt-3 space-y-1.5">
      {payments.map((p) => (
        <PaymentRowItem key={p.id} debtId={debtId} payment={p} />
      ))}
    </ul>
  );
}

function PaymentRowItem({
  debtId,
  payment,
}: {
  debtId: number;
  payment: PaymentRow;
}) {
  const [pending, start] = useTransition();

  function remove() {
    start(() => deletePayment(payment.id, debtId));
  }

  return (
    <li
      className={`flex items-center gap-2 rounded-lg border border-zinc-800/70 bg-zinc-900/40 px-3 py-2 ${
        pending ? "opacity-50" : ""
      }`}
    >
      <span className="w-20 shrink-0 text-sm font-semibold tabular-nums text-emerald-400">
        −{currency(payment.amount)}
      </span>
      <span className="w-14 shrink-0 text-[11px] text-zinc-500">
        {shortDate(payment.paid_on)}
      </span>
      <span className="min-w-0 flex-1 truncate text-xs text-zinc-400">
        {payment.note}
      </span>
      <button
        type="button"
        onClick={remove}
        disabled={pending}
        aria-label="Delete payment"
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-zinc-600 hover:bg-zinc-800 hover:text-rose-400"
      >
        <span className="text-base leading-none">×</span>
      </button>
    </li>
  );
}
