"use client";

import { useRef, useTransition } from "react";
import type { KanbanCard } from "./page";
import { addCard, deleteCard, moveCard } from "./actions";

interface LaneMeta {
  key: string;
  label: string;
  dot: string;
}

const LANES: LaneMeta[] = [
  { key: "todo", label: "To do", dot: "bg-zinc-500" },
  { key: "doing", label: "Doing", dot: "bg-cyan-500" },
  { key: "done", label: "Done", dot: "bg-emerald-500" },
];

export function KanbanView({ cards }: { cards: KanbanCard[] }) {
  const byLane = (lane: string) => cards.filter((c) => c.lane === lane);
  const counts = Object.fromEntries(LANES.map((l) => [l.key, byLane(l.key).length]));
  const total = cards.length;
  const done = counts["done"] || 0;
  const pct = total ? Math.round((done / total) * 100) : 0;

  return (
    <div className="space-y-5">
      {/* Hero: progress */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
        <div className="flex items-baseline justify-between">
          <span className="text-sm font-medium text-zinc-300">
            {total === 0 ? "No cards yet" : `${done} of ${total} done`}
          </span>
          <span className="text-sm font-semibold tabular-nums text-emerald-400">{pct}%</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-800">
          <div
            className="h-full rounded-full bg-emerald-500 motion-safe:transition-[width]"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {LANES.map((l) => (
          <div
            key={l.key}
            className="rounded-xl border border-zinc-800 bg-zinc-900/40 px-3 py-3 text-center"
          >
            <div className="text-base font-semibold tabular-nums text-zinc-100">
              {counts[l.key] || 0}
            </div>
            <div className="mt-0.5 text-[10px] font-medium uppercase tracking-wider text-zinc-500">
              {l.label}
            </div>
          </div>
        ))}
      </div>

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
    <div className="flex min-w-[78%] shrink-0 snap-start flex-col rounded-2xl border border-zinc-800 bg-zinc-900/30 p-3 sm:min-w-0 sm:flex-1">
      <div className="mb-3 flex items-center gap-2">
        <span className={`inline-block h-2.5 w-2.5 rounded-full ${lane.dot}`} />
        <h3 className="text-sm font-semibold text-zinc-100">{lane.label}</h3>
        <span className="ml-auto text-xs tabular-nums text-zinc-500">{cards.length}</span>
      </div>

      <ul className="flex-1 space-y-2">
        {cards.map((c) => (
          <CardItem key={c.id} card={c} prev={prev} next={next} />
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
}: {
  card: KanbanCard;
  prev?: string;
  next?: string;
}) {
  const [pending, start] = useTransition();

  function remove() {
    if (!confirm("Delete this card?")) return;
    start(() => deleteCard(card.id));
  }

  return (
    <li
      className={`rounded-xl border border-zinc-800 bg-zinc-900/70 p-2.5 ${
        pending ? "opacity-50" : ""
      }`}
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
