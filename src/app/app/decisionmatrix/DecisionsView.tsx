"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import type { DecisionData } from "./page";
import {
  computeResults,
  recommendedOptionId,
  revisitDue,
  scoreKey,
  isoDate,
} from "./lib";
import {
  addCriterion,
  addDecision,
  addOption,
  deleteCriterion,
  deleteDecision,
  deleteOption,
  duplicateDecision,
  recordDecision,
  recordOutcome,
  setCriterionWeight,
  setScore,
} from "./actions";
import { Ring, StatusPill } from "../_factories/FactoryUI";
import { hexAlpha } from "../_factories/factoryLib";

type Tone = "cyan" | "amber" | "emerald" | "rose" | "zinc";

const EMERALD = "#34d399";
const AMBER = "#fbbf24";
const ROSE = "#fb7185";

/** Hue for a 0–100 weighted score: emerald (strong) → amber (middling) → rose (weak). */
function scoreHue(pct: number): string {
  if (pct >= 67) return EMERALD;
  if (pct >= 40) return AMBER;
  return ROSE;
}

function scoreTone(pct: number): Tone {
  if (pct >= 67) return "emerald";
  if (pct >= 40) return "amber";
  return "rose";
}

export function DecisionsView({ decisions }: { decisions: DecisionData[] }) {
  const [openId, setOpenId] = useState<number | null>(decisions[0]?.id ?? null);
  const open = decisions.find((d) => d.id === openId) ?? null;

  return (
    <div className="space-y-6">
      <AddDecisionForm onCreated={setOpenId} />
      {decisions.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-3">
          {decisions.map((d) => (
            <DecisionCard
              key={d.id}
              decision={d}
              isOpen={d.id === openId}
              onToggle={() => setOpenId(d.id === openId ? null : d.id)}
            />
          ))}
        </div>
      )}
      {open && <span className="sr-only">{open.question}</span>}
    </div>
  );
}

function AddDecisionForm({ onCreated }: { onCreated: (id: number) => void }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, start] = useTransition();

  function submit(formData: FormData) {
    const q = String(formData.get("question") || "").trim();
    if (!q) return;
    start(async () => {
      const id = await addDecision(q);
      formRef.current?.reset();
      if (id) onCreated(id);
    });
  }

  return (
    <form
      ref={formRef}
      action={submit}
      className="flex items-center gap-2 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-2"
    >
      <input
        name="question"
        autoComplete="off"
        placeholder="What are you deciding?"
        className="min-w-0 flex-1 bg-transparent px-2 py-2 text-base text-zinc-100 placeholder:text-zinc-500 outline-none"
      />
      <button
        type="submit"
        disabled={pending}
        className="min-h-[44px] rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-cyan-400 disabled:opacity-50"
      >
        New
      </button>
    </form>
  );
}

function DecisionCard({
  decision,
  isOpen,
  onToggle,
}: {
  decision: DecisionData;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const results = useMemo(
    () => computeResults(decision.options, decision.criteria, decision.scores),
    [decision.options, decision.criteria, decision.scores],
  );
  const winnerId = useMemo(() => recommendedOptionId(results), [results]);
  const winner = decision.options.find((o) => o.id === winnerId) ?? null;
  const winnerPct = winner ? results.find((r) => r.optionId === winner.id)?.pct ?? 0 : 0;
  const chosen = decision.options.find((o) => o.id === decision.chosenOptionId) ?? null;
  const due = revisitDue(decision.revisitAt) && decision.status !== "revisit";

  const ringTone: Tone = winner ? scoreTone(winnerPct) : "zinc";

  const [pending, start] = useTransition();
  function remove() {
    if (!confirm("Delete this decision and its matrix?")) return;
    start(() => deleteDecision(decision.id));
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/40">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
      >
        <Ring pct={winner ? winnerPct / 100 : 0} size={48} stroke={5} tone={ringTone}>
          <span className="text-[11px] font-bold tabular-nums text-zinc-200">
            {winner ? `${winnerPct}%` : "—"}
          </span>
        </Ring>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="break-words text-sm font-semibold text-zinc-100">
              {decision.question}
            </span>
            {chosen ? (
              <StatusPill label="Decided" tone="emerald" />
            ) : due ? (
              <StatusPill label="Revisit" tone="amber" />
            ) : winner ? (
              <StatusPill label="Open" tone="cyan" />
            ) : null}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-zinc-500">
            <span>
              {decision.options.length} option{decision.options.length === 1 ? "" : "s"}
            </span>
            <span>
              {decision.criteria.length} criteri{decision.criteria.length === 1 ? "on" : "a"}
            </span>
            {winner ? (
              <span className="text-cyan-300">Lead: {winner.label}</span>
            ) : results.length > 1 ? (
              <span className="text-zinc-400">No clear lead</span>
            ) : null}
            {chosen && <span className="text-emerald-300">Chose: {chosen.label}</span>}
          </div>
        </div>
        <span className="shrink-0 text-zinc-500">{isOpen ? "▾" : "▸"}</span>
      </button>

      {isOpen && (
        <div className="space-y-5 border-t border-zinc-800 px-4 py-4">
          <Matrix decision={decision} results={results} winnerId={winnerId} />
          <RecordPanel decision={decision} winnerId={winnerId} />
          {due && <RevisitPanel decision={decision} />}
          <div className="flex flex-wrap gap-2">
            <SecondaryButton onClick={() => start(() => void duplicateDecision(decision.id))}>
              Duplicate as template
            </SecondaryButton>
            <button
              type="button"
              onClick={remove}
              disabled={pending}
              className="min-h-[40px] rounded-lg border border-zinc-800 px-3 py-2 text-xs font-medium text-zinc-500 hover:border-red-500/40 hover:text-red-400 disabled:opacity-50"
            >
              Delete decision
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Matrix({
  decision,
  results,
  winnerId,
}: {
  decision: DecisionData;
  results: ReturnType<typeof computeResults>;
  winnerId: number | null;
}) {
  const [critIdx, setCritIdx] = useState(0);
  const resultById = new Map(results.map((r) => [r.optionId, r]));
  const criteria = decision.criteria;
  const hasGrid = decision.options.length > 0 && criteria.length > 0;
  const activeCriterion = criteria[Math.min(critIdx, Math.max(0, criteria.length - 1))];

  return (
    <div className="space-y-4">
      <Editors decision={decision} />

      {hasGrid && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Score each option
            </h4>
            {criteria.length > 1 && (
              <div className="flex items-center gap-2 text-xs text-zinc-400">
                <button
                  type="button"
                  aria-label="Previous criterion"
                  onClick={() => setCritIdx((i) => Math.max(0, i - 1))}
                  disabled={critIdx === 0}
                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-zinc-700 disabled:opacity-30"
                >
                  ‹
                </button>
                <span className="tabular-nums">
                  {critIdx + 1}/{criteria.length}
                </span>
                <button
                  type="button"
                  aria-label="Next criterion"
                  onClick={() => setCritIdx((i) => Math.min(criteria.length - 1, i + 1))}
                  disabled={critIdx >= criteria.length - 1}
                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-zinc-700 disabled:opacity-30"
                >
                  ›
                </button>
              </div>
            )}
          </div>

          {activeCriterion && (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-3">
              <div className="mb-2 flex items-baseline justify-between">
                <span className="text-sm font-medium text-zinc-200">{activeCriterion.label}</span>
                <span className="text-[11px] text-zinc-500">weight ×{activeCriterion.weight}</span>
              </div>
              <ul className="space-y-3">
                {decision.options.map((o) => (
                  <ScoreRow
                    key={o.id}
                    decisionId={decision.id}
                    optionId={o.id}
                    optionLabel={o.label}
                    criterionId={activeCriterion.id}
                    value={decision.scores[scoreKey(o.id, activeCriterion.id)] ?? 5}
                  />
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {hasGrid && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Weighted result
          </h4>
          {[...decision.options]
            .sort((a, b) => (resultById.get(b.id)?.weighted ?? 0) - (resultById.get(a.id)?.weighted ?? 0))
            .map((o) => {
              const r = resultById.get(o.id);
              const pct = r?.pct ?? 0;
              const isWinner = o.id === winnerId;
              const hue = scoreHue(pct);
              return (
                <div
                  key={o.id}
                  className="rounded-xl border p-3"
                  style={{ background: hexAlpha(hue, 0.05), borderColor: hexAlpha(hue, 0.25) }}
                >
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <span className="flex min-w-0 items-center gap-2">
                      {isWinner && <StatusPill label="Pick" tone="cyan" />}
                      <span className="truncate text-sm font-medium text-zinc-100">{o.label}</span>
                    </span>
                    <span className="shrink-0 text-sm font-semibold tabular-nums text-zinc-300">
                      {pct}%
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${pct}%`, background: hue }}
                    />
                  </div>
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}

function ScoreRow({
  decisionId,
  optionId,
  optionLabel,
  criterionId,
  value,
}: {
  decisionId: number;
  optionId: number;
  optionLabel: string;
  criterionId: number;
  value: number;
}) {
  const [pending, start] = useTransition();
  return (
    <li className={pending ? "opacity-60" : ""}>
      <div className="mb-1 flex items-center justify-between">
        <span className="truncate text-sm text-zinc-300">{optionLabel}</span>
        <span className="text-sm font-semibold tabular-nums text-cyan-300">{value}</span>
      </div>
      <input
        type="range"
        min={1}
        max={10}
        step={1}
        value={value}
        aria-label={`Score for ${optionLabel}`}
        onChange={(e) =>
          start(() => setScore(decisionId, optionId, criterionId, Number(e.target.value)))
        }
        className="h-2 w-full cursor-pointer accent-cyan-500"
      />
    </li>
  );
}

function Editors({ decision }: { decision: DecisionData }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <OptionsEditor decision={decision} />
      <CriteriaEditor decision={decision} />
    </div>
  );
}

function OptionsEditor({ decision }: { decision: DecisionData }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, start] = useTransition();

  function submit(fd: FormData) {
    const label = String(fd.get("label") || "").trim();
    if (!label) return;
    start(async () => {
      await addOption(decision.id, label);
      formRef.current?.reset();
    });
  }

  return (
    <div>
      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">Options</h4>
      <ul className="mb-2 space-y-1.5">
        {decision.options.map((o) => (
          <li
            key={o.id}
            className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/40 px-3 py-2"
          >
            <span className="min-w-0 flex-1 truncate text-sm text-zinc-200">{o.label}</span>
            <RemoveBtn label="option" onClick={() => deleteOption(o.id)} />
          </li>
        ))}
        {decision.options.length === 0 && (
          <li className="rounded-lg border border-dashed border-zinc-800 px-3 py-2 text-xs text-zinc-600">
            Add the choices you are weighing.
          </li>
        )}
      </ul>
      <form ref={formRef} action={submit} className="flex gap-2">
        <input
          name="label"
          autoComplete="off"
          placeholder="Add option…"
          className="min-w-0 flex-1 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-cyan-500"
        />
        <button
          type="submit"
          disabled={pending}
          className="min-h-[40px] rounded-lg border border-zinc-700 px-3 text-sm text-zinc-200 hover:border-cyan-500 disabled:opacity-50"
        >
          +
        </button>
      </form>
    </div>
  );
}

function CriteriaEditor({ decision }: { decision: DecisionData }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, start] = useTransition();

  function submit(fd: FormData) {
    const label = String(fd.get("label") || "").trim();
    const weight = Number(fd.get("weight") || 3);
    if (!label) return;
    start(async () => {
      await addCriterion(decision.id, label, weight);
      formRef.current?.reset();
    });
  }

  return (
    <div>
      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
        Criteria (weight 1–5)
      </h4>
      <ul className="mb-2 space-y-1.5">
        {decision.criteria.map((c) => (
          <CriterionRow key={c.id} id={c.id} label={c.label} weight={c.weight} />
        ))}
        {decision.criteria.length === 0 && (
          <li className="rounded-lg border border-dashed border-zinc-800 px-3 py-2 text-xs text-zinc-600">
            Add what matters, weight each.
          </li>
        )}
      </ul>
      <form ref={formRef} action={submit} className="flex gap-2">
        <input
          name="label"
          autoComplete="off"
          placeholder="Add criterion…"
          className="min-w-0 flex-1 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-cyan-500"
        />
        <select
          name="weight"
          defaultValue={3}
          aria-label="Weight"
          className="rounded-lg border border-zinc-800 bg-zinc-900 px-2 text-sm text-zinc-200 outline-none focus:border-cyan-500"
        >
          {[1, 2, 3, 4, 5].map((w) => (
            <option key={w} value={w}>
              ×{w}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={pending}
          className="min-h-[40px] rounded-lg border border-zinc-700 px-3 text-sm text-zinc-200 hover:border-cyan-500 disabled:opacity-50"
        >
          +
        </button>
      </form>
    </div>
  );
}

function CriterionRow({ id, label, weight }: { id: number; label: string; weight: number }) {
  const [pending, start] = useTransition();
  return (
    <li
      className={`flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/40 px-3 py-2 ${
        pending ? "opacity-60" : ""
      }`}
    >
      <span className="min-w-0 flex-1 truncate text-sm text-zinc-200">{label}</span>
      <select
        value={weight}
        aria-label={`Weight for ${label}`}
        onChange={(e) => start(() => setCriterionWeight(id, Number(e.target.value)))}
        className="rounded-md border border-zinc-700 bg-zinc-900 px-1.5 py-1 text-xs text-zinc-300 outline-none focus:border-cyan-500"
      >
        {[1, 2, 3, 4, 5].map((w) => (
          <option key={w} value={w}>
            ×{w}
          </option>
        ))}
      </select>
      <RemoveBtn label="criterion" onClick={() => deleteCriterion(id)} />
    </li>
  );
}

function RecordPanel({
  decision,
  winnerId,
}: {
  decision: DecisionData;
  winnerId: number | null;
}) {
  const [pending, start] = useTransition();
  const [chosen, setChosen] = useState<string>(
    decision.chosenOptionId != null ? String(decision.chosenOptionId) : "",
  );
  const [rationale, setRationale] = useState(decision.rationale);
  const [revisit, setRevisit] = useState(decision.revisitAt ?? "");

  function save() {
    start(() =>
      recordDecision(
        decision.id,
        chosen ? Number(chosen) : null,
        rationale,
        revisit || null,
      ),
    );
  }

  if (decision.options.length === 0) return null;

  return (
    <div className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-900/40 p-3">
      <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
        Record the decision
      </h4>
      <div className="space-y-2">
        <label className="block text-xs text-zinc-400">Chosen option</label>
        <select
          value={chosen}
          onChange={(e) => setChosen(e.target.value)}
          className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-cyan-500"
        >
          <option value="">— not decided —</option>
          {decision.options.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
              {o.id === winnerId ? " (recommended)" : ""}
            </option>
          ))}
        </select>
        {winnerId != null && chosen && Number(chosen) !== winnerId && (
          <p className="text-[11px] text-amber-300">
            Note: you chose against the computed recommendation.
          </p>
        )}
      </div>
      <textarea
        value={rationale}
        onChange={(e) => setRationale(e.target.value)}
        placeholder="Why this call? (rationale)"
        rows={2}
        className="w-full resize-none rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-cyan-500"
      />
      <div className="flex items-center gap-2">
        <label className="text-xs text-zinc-400">Revisit on</label>
        <input
          type="date"
          value={revisit}
          min={isoDate()}
          onChange={(e) => setRevisit(e.target.value)}
          className="rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-200 outline-none focus:border-cyan-500"
        />
      </div>
      <button
        type="button"
        onClick={save}
        disabled={pending}
        className="min-h-[44px] w-full rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-cyan-400 disabled:opacity-50"
      >
        Save decision
      </button>
    </div>
  );
}

function RevisitPanel({ decision }: { decision: DecisionData }) {
  const [pending, start] = useTransition();
  const ratings = [
    { v: "good", label: "Right call", cls: "border-emerald-500/40 text-emerald-300" },
    { v: "mixed", label: "Mixed", cls: "border-amber-500/40 text-amber-300" },
    { v: "wrong", label: "Wrong call", cls: "border-rose-500/40 text-rose-300" },
  ];
  return (
    <div className="space-y-2 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3">
      <h4 className="text-xs font-semibold uppercase tracking-wider text-amber-300">
        Was this the right call?
      </h4>
      <div className="flex flex-wrap gap-2">
        {ratings.map((r) => (
          <button
            key={r.v}
            type="button"
            disabled={pending}
            onClick={() => start(() => recordOutcome(decision.id, r.v))}
            className={`min-h-[40px] flex-1 rounded-lg border bg-zinc-900/40 px-3 py-2 text-sm font-medium disabled:opacity-50 ${r.cls}`}
          >
            {r.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function RemoveBtn({ onClick, label }: { onClick: () => void; label: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      aria-label={`Delete ${label}`}
      disabled={pending}
      onClick={() => start(() => onClick())}
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-800 hover:text-red-400 disabled:opacity-50"
    >
      <span className="text-lg leading-none">×</span>
    </button>
  );
}

function SecondaryButton({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => start(() => onClick())}
      className="min-h-[40px] rounded-lg border border-zinc-700 px-3 py-2 text-xs font-medium text-zinc-300 hover:border-cyan-500 disabled:opacity-50"
    >
      {children}
    </button>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-8 text-center">
      <div className="text-3xl text-zinc-600">◰</div>
      <p className="mt-2 text-sm text-zinc-300">No decisions yet.</p>
      <p className="text-xs text-zinc-500">
        Pose a question above, then add options and weighted criteria to score them.
      </p>
    </div>
  );
}
