"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { currency, currencyCompact, shortDate } from "../_factories/factoryLib";
import {
  addContribution,
  createGoal,
  deleteContribution,
  deleteGoal,
  updateGoal,
} from "./actions";
import {
  monthLabel,
  statsFor,
  totalSaved,
  type ContributionRow,
  type GoalRow,
  type PaceTone,
} from "./lib";

export function SavingsView({
  goals,
  contributions,
}: {
  goals: GoalRow[];
  contributions: ContributionRow[];
}) {
  const byGoal = useMemo(() => {
    const m = new Map<number, ContributionRow[]>();
    for (const c of contributions) {
      const list = m.get(c.goal_id) ?? [];
      list.push(c);
      m.set(c.goal_id, list);
    }
    return m;
  }, [contributions]);

  const totalAll = totalSaved(contributions);
  const combinedMonthly = useMemo(
    () =>
      goals.reduce(
        (acc, g) => acc + statsFor(g, byGoal.get(g.id) ?? []).actualMonthly,
        0
      ),
    [goals, byGoal]
  );

  return (
    <div className="space-y-6">
      <Dashboard
        totalAll={totalAll}
        combinedMonthly={combinedMonthly}
        goalCount={goals.length}
      />

      <NewGoalForm />

      {goals.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-zinc-800 px-4 py-6 text-center text-sm text-zinc-500">
          No savings goals yet. Add one above to start tracking deposits.
        </p>
      ) : (
        <ul className="space-y-4">
          {goals.map((g) => (
            <GoalCard
              key={g.id}
              goal={g}
              contribs={byGoal.get(g.id) ?? []}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function Dashboard({
  totalAll,
  combinedMonthly,
  goalCount,
}: {
  totalAll: number;
  combinedMonthly: number;
  goalCount: number;
}) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
      <div className="text-xs font-medium uppercase tracking-wider text-zinc-500">
        Total saved
      </div>
      <div className="mt-1 text-4xl font-bold tabular-nums text-cyan-400">
        {currencyCompact(totalAll)}
      </div>
      {goalCount > 0 && (
        <div className="mt-3 flex gap-4 text-xs text-zinc-500">
          <span>
            <span className="font-semibold text-zinc-300">{goalCount}</span>{" "}
            goal{goalCount === 1 ? "" : "s"}
          </span>
          {combinedMonthly > 0 && (
            <span>
              ~
              <span className="font-semibold text-zinc-300">
                {currency(combinedMonthly)}
              </span>
              /mo recent pace
            </span>
          )}
        </div>
      )}
    </div>
  );
}

const PACE_META: Record<PaceTone, { label: string; tone: string }> = {
  ahead: { label: "ahead of pace", tone: "text-emerald-400" },
  behind: { label: "behind pace", tone: "text-rose-400" },
  on: { label: "on pace", tone: "text-cyan-300" },
  unknown: { label: "", tone: "text-zinc-500" },
};

function GoalCard({
  goal,
  contribs,
}: {
  goal: GoalRow;
  contribs: ContributionRow[];
}) {
  const [editing, setEditing] = useState(false);
  const stats = useMemo(() => statsFor(goal, contribs), [goal, contribs]);
  const pct = Math.round(stats.fraction * 100);

  return (
    <li className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="break-words text-base font-semibold text-zinc-100">
            {goal.title}
          </h3>
          <div className="mt-0.5 text-sm tabular-nums text-zinc-400">
            <span className="font-semibold text-cyan-300">
              {currency(stats.saved)}
            </span>
            {goal.target_value ? (
              <> / {currency(goal.target_value)}</>
            ) : null}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {stats.complete && (
            <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
              done
            </span>
          )}
          <button
            type="button"
            onClick={() => setEditing((v) => !v)}
            aria-label="Edit goal"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
          >
            <span className="text-sm">{editing ? "×" : "⋯"}</span>
          </button>
        </div>
      </div>

      {goal.target_value ? (
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
            <span>{pct}%</span>
            {stats.remaining > 0 && (
              <span>{currency(stats.remaining)} to go</span>
            )}
          </div>
        </div>
      ) : null}

      <PaceRow goal={goal} stats={stats} />

      {editing ? (
        <EditGoalForm goal={goal} onDone={() => setEditing(false)} />
      ) : (
        <>
          <AddContributionForm goalId={goal.id} />
          <ContributionLog goalId={goal.id} contribs={contribs} />
        </>
      )}
    </li>
  );
}

function PaceRow({
  goal,
  stats,
}: {
  goal: GoalRow;
  stats: ReturnType<typeof statsFor>;
}) {
  const bits: React.ReactNode[] = [];

  if (goal.due_date) {
    const m = stats.monthsLeft;
    bits.push(
      <span key="due">
        {m === null
          ? `due ${shortDate(goal.due_date)}`
          : m <= 0
            ? "due now"
            : `${m % 1 === 0 ? m : m.toFixed(1)} mo left`}
      </span>
    );
  }

  if (stats.requiredMonthly !== null && stats.requiredMonthly > 0 && !stats.complete) {
    bits.push(
      <span key="req">
        {currency(stats.requiredMonthly)}/mo to hit it
      </span>
    );
    if (stats.pace !== "unknown") {
      const meta = PACE_META[stats.pace];
      bits.push(
        <span key="pace" className={`font-semibold ${meta.tone}`}>
          {meta.label}
        </span>
      );
    }
  }

  if (stats.projected && !stats.complete) {
    bits.push(
      <span key="proj">on track for {monthLabel(stats.projected)}</span>
    );
  }

  if (bits.length === 0) return null;

  return (
    <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-zinc-400">
      {bits}
    </div>
  );
}

function NewGoalForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();

  function submit(formData: FormData) {
    const title = String(formData.get("title") || "").trim();
    const target = Number(formData.get("target") || 0);
    const due = String(formData.get("due") || "") || null;
    if (!title) return;
    start(async () => {
      await createGoal(title, target, due);
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
        + New savings goal
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
        name="title"
        autoComplete="off"
        autoFocus
        placeholder="Goal (e.g. Emergency fund)"
        className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-base text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-cyan-500/60"
      />
      <div className="flex gap-2">
        <input
          name="target"
          type="number"
          step="0.01"
          min="0"
          inputMode="decimal"
          placeholder="Target $"
          aria-label="Target amount"
          className="min-w-0 flex-1 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-right text-base tabular-nums text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-cyan-500/60"
        />
        <input
          name="due"
          type="date"
          aria-label="Target date"
          className="min-w-0 flex-1 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-base text-zinc-100 outline-none focus:border-cyan-500/60"
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
          {pending ? "Adding…" : "Add goal"}
        </button>
      </div>
    </form>
  );
}

function EditGoalForm({
  goal,
  onDone,
}: {
  goal: GoalRow;
  onDone: () => void;
}) {
  const [pending, start] = useTransition();

  function submit(formData: FormData) {
    const title = String(formData.get("title") || "").trim();
    const target = Number(formData.get("target") || 0);
    const due = String(formData.get("due") || "") || null;
    if (!title) return;
    start(async () => {
      await updateGoal(goal.id, title, target, due);
      onDone();
    });
  }

  function remove() {
    if (!confirm(`Delete "${goal.title}" and all its contributions?`)) return;
    start(async () => {
      await deleteGoal(goal.id);
    });
  }

  return (
    <form
      action={submit}
      className="mt-3 space-y-2 rounded-xl border border-zinc-800 bg-zinc-900/60 p-3"
    >
      <input
        name="title"
        autoComplete="off"
        defaultValue={goal.title}
        placeholder="Goal title"
        className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-base text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-cyan-500/60"
      />
      <div className="flex gap-2">
        <input
          name="target"
          type="number"
          step="0.01"
          min="0"
          inputMode="decimal"
          defaultValue={goal.target_value ?? ""}
          placeholder="Target $"
          aria-label="Target amount"
          className="min-w-0 flex-1 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-right text-base tabular-nums text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-cyan-500/60"
        />
        <input
          name="due"
          type="date"
          defaultValue={goal.due_date ?? ""}
          aria-label="Target date"
          className="min-w-0 flex-1 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-base text-zinc-100 outline-none focus:border-cyan-500/60"
        />
      </div>
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

function AddContributionForm({ goalId }: { goalId: number }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, start] = useTransition();

  function submit(formData: FormData) {
    const amount = Number(formData.get("amount") || 0);
    const date = String(formData.get("date") || "") || null;
    const note = String(formData.get("note") || "");
    if (!Number.isFinite(amount) || amount === 0) return;
    start(async () => {
      await addContribution(goalId, amount, date, note);
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
          inputMode="decimal"
          placeholder="Amount $"
          aria-label="Contribution amount"
          className="w-28 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-right text-base tabular-nums text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-cyan-500/60"
        />
        <input
          name="date"
          type="date"
          defaultValue={today}
          aria-label="Contribution date"
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
          {pending ? "…" : "+ Add"}
        </button>
      </div>
    </form>
  );
}

function ContributionLog({
  goalId,
  contribs,
}: {
  goalId: number;
  contribs: ContributionRow[];
}) {
  if (contribs.length === 0) {
    return (
      <p className="mt-3 text-xs text-zinc-600">No contributions yet.</p>
    );
  }
  return (
    <ul className="mt-3 space-y-1.5">
      {contribs.map((c) => (
        <ContributionRowItem key={c.id} goalId={goalId} contrib={c} />
      ))}
    </ul>
  );
}

function ContributionRowItem({
  goalId,
  contrib,
}: {
  goalId: number;
  contrib: ContributionRow;
}) {
  const [pending, start] = useTransition();

  function remove() {
    start(() => deleteContribution(contrib.id, goalId));
  }

  return (
    <li
      className={`flex items-center gap-2 rounded-lg border border-zinc-800/70 bg-zinc-900/40 px-3 py-2 ${
        pending ? "opacity-50" : ""
      }`}
    >
      <span className="w-20 shrink-0 text-sm font-semibold tabular-nums text-emerald-400">
        +{currency(contrib.amount)}
      </span>
      <span className="w-14 shrink-0 text-[11px] text-zinc-500">
        {shortDate(contrib.contributed_on)}
      </span>
      <span className="min-w-0 flex-1 truncate text-xs text-zinc-400">
        {contrib.note}
      </span>
      <button
        type="button"
        onClick={remove}
        disabled={pending}
        aria-label="Delete contribution"
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-zinc-600 hover:bg-zinc-800 hover:text-rose-400"
      >
        <span className="text-base leading-none">×</span>
      </button>
    </li>
  );
}
