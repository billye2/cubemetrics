"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { addCardAction, deleteCardAction, reviewCardAction, type Rating } from "./actions";

export interface Card {
  id: number;
  deck: string;
  front: string;
  back: string;
  ease: number;
  interval: number;
  reps: number;
  due_date: string;
  created_at: string;
}

const RATINGS: { id: Rating; label: string; cls: string }[] = [
  { id: "again", label: "Again", cls: "bg-red-500/20 text-red-300 ring-1 ring-red-500/30 hover:bg-red-500/30" },
  { id: "hard", label: "Hard", cls: "bg-amber-500/20 text-amber-200 ring-1 ring-amber-500/30 hover:bg-amber-500/30" },
  { id: "good", label: "Good", cls: "bg-cyan-500/20 text-cyan-200 ring-1 ring-cyan-500/30 hover:bg-cyan-500/30" },
  { id: "easy", label: "Easy", cls: "bg-emerald-500/20 text-emerald-200 ring-1 ring-emerald-500/30 hover:bg-emerald-500/30" },
];

export function FlashcardsView({
  cards,
  today,
  dueCount,
  mastered,
}: {
  cards: Card[];
  today: string;
  dueCount: number;
  mastered: number;
}) {
  const [studying, setStudying] = useState(false);
  const dueCards = useMemo(() => cards.filter((c) => c.due_date <= today), [cards, today]);

  return (
    <div>
      <div className="mb-4 grid grid-cols-3 gap-3">
        <Stat label="Cards" value={String(cards.length)} />
        <Stat label="Due" value={String(dueCount)} tone={dueCount > 0 ? "cyan" : undefined} />
        <Stat label="Mastered" value={String(mastered)} />
      </div>

      {studying ? (
        <StudySession queue={dueCards} onExit={() => setStudying(false)} />
      ) : (
        <>
          <button
            type="button"
            onClick={() => setStudying(true)}
            disabled={dueCards.length === 0}
            className="flex h-12 w-full items-center justify-center rounded-xl bg-cyan-500 text-base font-semibold text-zinc-950 hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {dueCards.length > 0 ? `Study ${dueCards.length} due card${dueCards.length === 1 ? "" : "s"}` : "Nothing due — all caught up"}
          </button>
          <ManageCards cards={cards} />
        </>
      )}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "cyan" }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-3 text-center">
      <div className={`text-xl font-bold tracking-tight ${tone === "cyan" ? "text-cyan-400" : "text-zinc-100"}`}>
        {value}
      </div>
      <div className="text-[10px] uppercase tracking-wider text-zinc-500">{label}</div>
    </div>
  );
}

function StudySession({ queue, onExit }: { queue: Card[]; onExit: () => void }) {
  // Snapshot the due queue once so server revalidations don't reshuffle mid-session.
  const [cards] = useState<Card[]>(queue);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [reviewed, setReviewed] = useState(0);
  // Cards rated "Again" get requeued to the end of this session.
  const [extra, setExtra] = useState<Card[]>([]);
  const [, start] = useTransition();

  const allCards = [...cards, ...extra];
  const current = allCards[index];

  function rate(rating: Rating) {
    if (!current) return;
    start(() => reviewCardAction(current.id, rating, current.ease, current.interval, current.reps));
    setReviewed((n) => n + 1);
    if (rating === "again") setExtra((e) => [...e, current]);
    setFlipped(false);
    setIndex((i) => i + 1);
  }

  if (!current) {
    return (
      <div className="rounded-3xl border border-zinc-800 bg-zinc-900/40 p-8 text-center">
        <div className="text-3xl">✓</div>
        <h3 className="mt-2 text-lg font-semibold text-zinc-100">Session complete</h3>
        <p className="mt-1 text-sm text-zinc-400">{reviewed} review{reviewed === 1 ? "" : "s"} done. Nice work.</p>
        <button
          type="button"
          onClick={onExit}
          className="mt-5 rounded-xl bg-cyan-500 px-5 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-cyan-400"
        >
          Done
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between text-xs text-zinc-500">
        <span>{current.deck}</span>
        <span>{index + 1} / {allCards.length}</span>
      </div>
      <button
        type="button"
        onClick={() => setFlipped((v) => !v)}
        className="flex min-h-56 w-full flex-col items-center justify-center gap-3 rounded-3xl border border-zinc-800 bg-zinc-900/40 p-8 text-center"
      >
        <div className="text-[10px] uppercase tracking-wider text-zinc-500">{flipped ? "Back" : "Front"}</div>
        <div className="text-xl font-medium text-zinc-100">{flipped ? current.back : current.front}</div>
        {!flipped && <div className="mt-2 text-xs text-zinc-600">tap to flip</div>}
      </button>

      {flipped ? (
        <div className="mt-4 grid grid-cols-4 gap-2">
          {RATINGS.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => rate(r.id)}
              className={`rounded-xl px-2 py-3 text-xs font-semibold transition ${r.cls}`}
            >
              {r.label}
            </button>
          ))}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setFlipped(true)}
          className="mt-4 h-11 w-full rounded-xl bg-zinc-800 text-sm font-semibold text-zinc-200 hover:bg-zinc-700"
        >
          Show answer
        </button>
      )}

      <button
        type="button"
        onClick={onExit}
        className="mt-3 w-full text-center text-xs font-medium text-zinc-500 hover:text-zinc-300"
      >
        End session
      </button>
    </div>
  );
}

function ManageCards({ cards }: { cards: Card[] }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [showForm, setShowForm] = useState(false);
  const [pending, start] = useTransition();

  const decks = useMemo(() => {
    const groups = new Map<string, Card[]>();
    for (const c of cards) {
      const arr = groups.get(c.deck) ?? [];
      arr.push(c);
      groups.set(c.deck, arr);
    }
    return [...groups.entries()];
  }, [cards]);

  function submit(formData: FormData) {
    const deck = String(formData.get("deck") || "");
    const front = String(formData.get("front") || "");
    const back = String(formData.get("back") || "");
    if (!front.trim() || !back.trim()) return;
    start(async () => {
      await addCardAction(deck, front, back);
      formRef.current?.reset();
    });
  }

  return (
    <div className="mt-6">
      {!showForm ? (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="flex h-11 w-full items-center justify-center rounded-xl bg-zinc-800 text-sm font-semibold text-zinc-200 hover:bg-zinc-700"
        >
          + Add card
        </button>
      ) : (
        <form ref={formRef} action={submit} className="space-y-2 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-3">
          <input
            name="deck"
            list="deck-options"
            autoComplete="off"
            defaultValue="General"
            placeholder="Deck"
            className="w-full rounded-lg bg-zinc-900 px-3 py-2 text-base text-zinc-100 placeholder:text-zinc-500 outline-none ring-1 ring-zinc-800 focus:ring-cyan-500/50"
          />
          <datalist id="deck-options">
            {decks.map(([name]) => (
              <option key={name} value={name} />
            ))}
          </datalist>
          <input
            name="front"
            autoComplete="off"
            placeholder="Front (question / prompt)"
            className="w-full rounded-lg bg-zinc-900 px-3 py-2 text-base text-zinc-100 placeholder:text-zinc-500 outline-none ring-1 ring-zinc-800 focus:ring-cyan-500/50"
          />
          <input
            name="back"
            autoComplete="off"
            placeholder="Back (answer)"
            className="w-full rounded-lg bg-zinc-900 px-3 py-2 text-base text-zinc-100 placeholder:text-zinc-500 outline-none ring-1 ring-zinc-800 focus:ring-cyan-500/50"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="flex-1 rounded-lg bg-zinc-800 px-3 py-2 text-sm font-semibold text-zinc-300 hover:bg-zinc-700"
            >
              Close
            </button>
            <button
              type="submit"
              disabled={pending}
              className="flex-1 rounded-lg bg-cyan-500 px-3 py-2 text-sm font-semibold text-zinc-950 hover:bg-cyan-400 disabled:opacity-50"
            >
              {pending ? "Adding…" : "Add card"}
            </button>
          </div>
        </form>
      )}

      {cards.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-8 text-center">
          <p className="text-sm text-zinc-400">No cards yet.</p>
          <p className="mt-1 text-xs text-zinc-500">Add a few, then study the ones that come due.</p>
        </div>
      ) : (
        <div className="mt-5 space-y-5">
          {decks.map(([deck, deckCards]) => (
            <div key={deck}>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                {deck} <span className="text-zinc-600">· {deckCards.length}</span>
              </h3>
              <ul className="space-y-2">
                {deckCards.map((c) => (
                  <CardRow key={c.id} card={c} />
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CardRow({ card }: { card: Card }) {
  const [pending, start] = useTransition();
  function remove() {
    if (!confirm("Delete this card?")) return;
    start(() => deleteCardAction(card.id));
  }
  return (
    <li className={`flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/40 px-3 py-2 ${pending ? "opacity-50" : ""}`}>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm text-zinc-100">{card.front}</div>
        <div className="truncate text-xs text-zinc-500">{card.back}</div>
      </div>
      {card.reps >= 3 && <span title="Mastered" className="text-xs text-emerald-400">★</span>}
      <button
        type="button"
        onClick={remove}
        className="rounded-lg p-1 text-zinc-600 hover:bg-zinc-800 hover:text-red-400"
      >
        ×
      </button>
    </li>
  );
}
