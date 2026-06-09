"use client";

import { useRef, useTransition } from "react";
import type { KanbanCard } from "./page";
import { addCard, deleteCard, moveCard } from "./actions";
import { Ring, StatTile, StatStrip } from "../_factories/FactoryUI";
import { hexAlpha } from "../_factories/factoryLib";

interface LaneMeta {
  key: string;
  label: string;
  dot: string;
  hex: string;
  tone: "zinc" | "cyan" | "emerald";
}

const LANES: LaneMeta[] = [
  { key: "todo", label: "To do", dot: "bg-zinc-500", hex: "#71717a", tone: "zinc" },
  { key: "doing", label: "Doing", dot: "bg-cyan-500", hex: "#06b6d4", tone: "cyan" },
  { key: "done", label: "Done", dot: "bg-emerald-500", hex: "#34d399", tone: "emerald" },
];

export function KanbanView({ cards }: { cards: KanbanCard[] }) {
  const byLane = (lane: string) => cards.filter((c) => c.lane === lane);
  const counts = Object.fromEntries(LANES.map((l) => [l.key, byLane(l.key).length]));
  const total = cards.length;
  const done = counts["done"] || 0;
  const pct = total ? Math.round((done / total) * 100) : 0;

  const allDone = total > 0 && done === total;

  return (
    <div className="space-y-5">
      {/* Hero: progress ring */}
      <div className="flex items-center gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
        <Ring pct={total ? done / total : 0} size={64} stroke={7} tone="emerald">
          <span className="text-[13px] font-bold tabular-nums text-zinc-200">{pct}%</span>
        </Ring>
        <div className="min-w-0">
          {total === 0 ? (
            <div className="text-[15px] font-semibold text-zinc-100">No cards yet</div>
          ) : allDone ? (
            <div className="text-[15px] font-bold text-emerald-400">✓ Board clear — all done</div>
          ) : (
            <div className="text-[15px] font-semibold text-zinc-100">{done} of {total} done</div>
          )}
          <div className="mt-0.5 text-xs text-zinc-500">
            {counts["todo"] || 0} to do · {counts["doing"] || 0} doing
          </div>
        </div>
      </div>

      <StatStrip cols={3}>
        {LANES.map((l) => (
          <StatTile key={l.key} label={l.label} value={String(counts[l.key] || 0)} tone={l.tone} />
        ))}
      </StatStrip>

      {/* Board */}
      <div className="-mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-2">
        {LANES.map((lane, i) => (
          <Column
            key={lane.key}
            lane={lane}
            cards={byLane(lane.key)}
            prev={LANES[i - 1]?.key}
            next={LANES[i + 1]?.key}
          />
        ))}
      </div>
    </div>
  );
}

function Column({
  lane,
  cards,
  prev,
  next,
}: {
  lane: LaneMeta;
  cards: KanbanCard[];
  prev?: string;
  next?: string;
}) {
  return (
    <div
      className="flex min-w-[78%] shrink-0 snap-start flex-col rounded-2xl border p-3 sm:min-w-0 sm:flex-1"
      style={{ background: hexAlpha(lane.hex, 0.05), borderColor: hexAlpha(lane.hex, 0.25) }}
    >
      <div className="mb-3 flex items-center gap-2">
        <span className={`inline-block h-2.5 w-2.5 rounded-full ${lane.dot}`} />
        <h3 className="text-sm font-semibold text-zinc-100">{lane.label}</h3>
        <span className="ml-auto text-xs tabular-nums text-zinc-500">{cards.length}</span>
      </div>

      <ul className="flex-1 space-y-2">
        {cards.map((c) => (
          <CardItem key={c.id} card={c} prev={prev} next={next} tint={lane.hex} />
        ))}
        {cards.length === 0 && (
          <li className="rounded-lg border border-dashed border-zinc-800 px-3 py-3 text-center text-xs text-zinc-600">
            Empty
          </li>
        )}
      </ul>

      <AddCard lane={lane.key} />
    </div>
  );
}

function CardItem({
  card,
  prev,
  next,
  tint,
}: {
  card: KanbanCard;
  prev?: string;
  next?: string;
  tint: string;
}) {
  const [pending, start] = useTransition();

  function remove() {
    if (!confirm("Delete this card?")) return;
    start(() => deleteCard(card.id));
  }

  return (
    <li
      className={`rounded-xl border p-2.5 ${pending ? "opacity-50" : ""}`}
      style={{ background: hexAlpha(tint, 0.1), borderColor: hexAlpha(tint, 0.28) }}
    >
      <p className="break-words text-sm text-zinc-100">{card.title}</p>
      <div className="mt-2 flex items-center gap-1">
        <MoveButton
          label="←"
          disabled={!prev || pending}
          onClick={() => prev && start(() => moveCard(card.id, prev))}
        />
        <MoveButton
          label="→"
          disabled={!next || pending}
          onClick={() => next && start(() => moveCard(card.id, next))}
        />
        <button
          type="button"
          onClick={remove}
          disabled={pending}
          aria-label="Delete card"
          className="ml-auto flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-800 hover:text-red-400"
        >
          <span className="text-lg leading-none">×</span>
        </button>
      </div>
    </li>
  );
}

function MoveButton({
  label,
  onClick,
  disabled,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label === "←" ? "Move left" : "Move right"}
      className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-700 text-sm text-zinc-300 hover:border-cyan-500/60 hover:text-cyan-300 disabled:opacity-30"
    >
      {label}
    </button>
  );
}

function AddCard({ lane }: { lane: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, start] = useTransition();

  function submit(formData: FormData) {
    const title = String(formData.get("title") || "").trim();
    if (!title) return;
    start(async () => {
      await addCard(lane, title);
      formRef.current?.reset();
    });
  }

  return (
    <form ref={formRef} action={submit} className="mt-2 flex items-center gap-1.5">
      <input
        name="title"
        autoComplete="off"
        placeholder="+ Add card"
        className="min-w-0 flex-1 rounded-lg border border-zinc-800 bg-zinc-900/60 px-2.5 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-cyan-500/60"
      />
      <button
        type="submit"
        disabled={pending}
        aria-label="Add card"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-cyan-500 text-lg font-semibold text-zinc-950 hover:bg-cyan-400 disabled:opacity-50"
      >
        +
      </button>
    </form>
  );
}
