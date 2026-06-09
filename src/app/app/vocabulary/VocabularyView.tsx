"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { addWordAction, deleteWordAction, reviewWordAction, type Rating } from "./actions";
import { Ring, StatTile, StatStrip, StatusPill, BucketSection } from "../_factories/FactoryUI";

type WordStatus = "due" | "learning" | "mastered";
const WS_TONE: Record<WordStatus, "cyan" | "amber" | "emerald"> = {
  due: "cyan",
  learning: "amber",
  mastered: "emerald",
};
const WS_LABEL: Record<WordStatus, string> = { due: "Due", learning: "Learning", mastered: "Mastered" };
const WS_SECTIONS: { key: WordStatus; label: string }[] = [
  { key: "due", label: "Due for review" },
  { key: "learning", label: "Learning" },
  { key: "mastered", label: "Mastered" },
];

function wordStatus(w: Word, today: string): WordStatus {
  if (w.due_date <= today) return "due";
  if (w.reps >= 3) return "mastered";
  return "learning";
}

export interface Word {
  id: number;
  word: string;
  definition: string;
  example: string | null;
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

export function VocabularyView({
  words,
  today,
  dueCount,
  mastered,
}: {
  words: Word[];
  today: string;
  dueCount: number;
  mastered: number;
}) {
  const [reviewing, setReviewing] = useState(false);
  const dueWords = useMemo(() => words.filter((w) => w.due_date <= today), [words, today]);

  const masteredPct = words.length ? mastered / words.length : 0;

  return (
    <div>
      {words.length > 0 && (
        <div className="mb-4 flex items-center gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
          <Ring pct={masteredPct} size={64} stroke={7} tone="emerald">
            <span className="text-[13px] font-bold tabular-nums text-zinc-200">
              {Math.round(masteredPct * 100)}%
            </span>
          </Ring>
          <div className="min-w-0">
            <div className="text-[15px] font-bold text-zinc-100">
              {mastered} of {words.length} mastered
            </div>
            <div className="mt-0.5 text-xs text-zinc-500">
              {dueCount > 0 ? `${dueCount} due for review` : "All caught up"}
            </div>
          </div>
        </div>
      )}

      <StatStrip cols={3}>
        <StatTile label="Words" value={String(words.length)} tone="zinc" />
        <StatTile label="Due" value={String(dueCount)} tone={dueCount > 0 ? "cyan" : "zinc"} />
        <StatTile label="Mastered" value={String(mastered)} tone="emerald" />
      </StatStrip>

      {reviewing ? (
        <ReviewSession queue={dueWords} onExit={() => setReviewing(false)} />
      ) : (
        <>
          <button
            type="button"
            onClick={() => setReviewing(true)}
            disabled={dueWords.length === 0}
            className="flex h-12 w-full items-center justify-center rounded-xl bg-cyan-500 text-base font-semibold text-zinc-950 hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {dueWords.length > 0
              ? `Review ${dueWords.length} word${dueWords.length === 1 ? "" : "s"} due`
              : "Nothing due — all caught up"}
          </button>
          <WordList words={words} today={today} />
        </>
      )}
    </div>
  );
}

function ReviewSession({ queue, onExit }: { queue: Word[]; onExit: () => void }) {
  // Snapshot the due queue once so server revalidations don't reshuffle mid-session.
  const [words] = useState<Word[]>(queue);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [reviewed, setReviewed] = useState(0);
  // Words rated "Again" get requeued to the end of this session.
  const [extra, setExtra] = useState<Word[]>([]);
  const [, start] = useTransition();

  const allWords = [...words, ...extra];
  const current = allWords[index];

  function rate(rating: Rating) {
    if (!current) return;
    start(() => reviewWordAction(current.id, rating, current.ease, current.interval, current.reps));
    setReviewed((n) => n + 1);
    if (rating === "again") setExtra((e) => [...e, current]);
    setRevealed(false);
    setIndex((i) => i + 1);
  }

  if (!current) {
    return (
      <div className="rounded-3xl border border-zinc-800 bg-zinc-900/40 p-8 text-center">
        <div className="text-3xl">✓</div>
        <h3 className="mt-2 text-lg font-semibold text-zinc-100">Session complete</h3>
        <p className="mt-1 text-sm text-zinc-400">
          {reviewed} review{reviewed === 1 ? "" : "s"} done. Nice work.
        </p>
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
      <div className="mb-3 flex items-center justify-end text-xs text-zinc-500">
        <span>
          {index + 1} / {allWords.length}
        </span>
      </div>
      <button
        type="button"
        onClick={() => setRevealed((v) => !v)}
        className="flex min-h-56 w-full flex-col items-center justify-center gap-3 rounded-3xl border border-zinc-800 bg-zinc-900/40 p-8 text-center"
      >
        <div className="text-2xl font-semibold text-zinc-100">{current.word}</div>
        {revealed ? (
          <>
            <div className="text-base text-zinc-300">{current.definition}</div>
            {current.example && (
              <div className="mt-1 text-sm italic text-zinc-500">&ldquo;{current.example}&rdquo;</div>
            )}
          </>
        ) : (
          <div className="mt-2 text-xs text-zinc-600">tap to reveal</div>
        )}
      </button>

      {revealed ? (
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
          onClick={() => setRevealed(true)}
          className="mt-4 h-11 w-full rounded-xl bg-zinc-800 text-sm font-semibold text-zinc-200 hover:bg-zinc-700"
        >
          Show definition
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

function WordList({ words, today }: { words: Word[]; today: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [showForm, setShowForm] = useState(false);
  const [pending, start] = useTransition();

  const groups: Record<WordStatus, Word[]> = { due: [], learning: [], mastered: [] };
  for (const w of words) groups[wordStatus(w, today)].push(w);

  function submit(formData: FormData) {
    const word = String(formData.get("word") || "");
    const definition = String(formData.get("definition") || "");
    const example = String(formData.get("example") || "");
    if (!word.trim() || !definition.trim()) return;
    start(async () => {
      await addWordAction(word, definition, example);
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
          + Add word
        </button>
      ) : (
        <form ref={formRef} action={submit} className="space-y-2 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-3">
          <input
            name="word"
            autoComplete="off"
            placeholder="Word"
            className="w-full rounded-lg bg-zinc-900 px-3 py-2 text-base text-zinc-100 placeholder:text-zinc-500 outline-none ring-1 ring-zinc-800 focus:ring-cyan-500/50"
          />
          <input
            name="definition"
            autoComplete="off"
            placeholder="Definition"
            className="w-full rounded-lg bg-zinc-900 px-3 py-2 text-base text-zinc-100 placeholder:text-zinc-500 outline-none ring-1 ring-zinc-800 focus:ring-cyan-500/50"
          />
          <input
            name="example"
            autoComplete="off"
            placeholder="Example sentence (optional)"
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
              {pending ? "Adding…" : "Add word"}
            </button>
          </div>
        </form>
      )}

      {words.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-8 text-center">
          <p className="text-sm text-zinc-400">No words yet.</p>
          <p className="mt-1 text-xs text-zinc-500">Add a few, then review the ones that come due.</p>
        </div>
      ) : (
        WS_SECTIONS.filter((s) => groups[s.key].length).map((s) => (
          <BucketSection key={s.key} label={s.label} count={groups[s.key].length}>
            {groups[s.key].map((w) => (
              <WordRow key={w.id} word={w} status={s.key} />
            ))}
          </BucketSection>
        ))
      )}
    </div>
  );
}

function WordRow({ word, status }: { word: Word; status: WordStatus }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();

  function remove(e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm("Delete this word?")) return;
    start(() => deleteWordAction(word.id));
  }

  return (
    <li className={`rounded-xl border border-zinc-800 bg-zinc-900/40 ${pending ? "opacity-50" : ""}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 px-3 py-2 text-left"
      >
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-zinc-100">{word.word}</span>
        <StatusPill label={WS_LABEL[status]} tone={WS_TONE[status]} />
        <span
          onClick={remove}
          role="button"
          tabIndex={0}
          className="rounded-lg p-1 text-zinc-600 hover:bg-zinc-800 hover:text-red-400"
        >
          ×
        </span>
      </button>
      {open && (
        <div className="border-t border-zinc-800 px-3 py-2">
          <div className="text-sm text-zinc-300">{word.definition}</div>
          {word.example && <div className="mt-1 text-xs italic text-zinc-500">&ldquo;{word.example}&rdquo;</div>}
        </div>
      )}
    </li>
  );
}
