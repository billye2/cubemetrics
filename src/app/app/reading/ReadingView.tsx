"use client";

import { useRef, useState, useTransition } from "react";
import type { BookRow, BookStatus } from "./page";
import { Ring, StatStrip, StatTile, StatusPill } from "../_factories/FactoryUI";
import {
  addBookAction,
  deleteBookAction,
  rateBookAction,
  updateDatesAction,
  updateNotesAction,
  updateProgressAction,
  updateStatusAction,
} from "./actions";

type Tone = "cyan" | "amber" | "emerald" | "rose" | "zinc";

const TABS: { id: BookStatus; label: string; tone: Tone }[] = [
  { id: "reading", label: "Reading", tone: "cyan" },
  { id: "to_read", label: "To Read", tone: "amber" },
  { id: "completed", label: "Completed", tone: "emerald" },
  { id: "dropped", label: "Dropped", tone: "rose" },
];

function statusTone(status: BookStatus): Tone {
  return TABS.find((t) => t.id === status)?.tone ?? "zinc";
}

function fmtDate(d: string | null): string | null {
  if (!d) return null;
  const dt = new Date(d + "T00:00:00");
  if (Number.isNaN(dt.getTime())) return null;
  return dt.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function daysBetween(a: string | null, b: string | null): number | null {
  if (!a || !b) return null;
  const da = new Date(a + "T00:00:00").getTime();
  const db = new Date(b + "T00:00:00").getTime();
  if (Number.isNaN(da) || Number.isNaN(db)) return null;
  const days = Math.round((db - da) / 86_400_000);
  return days >= 0 ? days : null;
}

export function ReadingView({ books }: { books: BookRow[] }) {
  const [tab, setTab] = useState<BookStatus>("reading");
  const filtered = books.filter((b) => b.status === tab);

  const counts: Record<BookStatus, number> = {
    reading: 0,
    to_read: 0,
    completed: 0,
    dropped: 0,
  };
  for (const b of books) counts[b.status] = (counts[b.status] || 0) + 1;

  return (
    <div className="space-y-4">
      <StatStrip cols={3}>
        <StatTile label="Reading" value={String(counts.reading)} tone="cyan" />
        <StatTile label="Completed" value={String(counts.completed)} tone="emerald" />
        <StatTile label="To Read" value={String(counts.to_read)} tone="amber" />
      </StatStrip>

      <AddBookForm />

      <div className="flex gap-1.5 overflow-x-auto rounded-2xl border border-zinc-800 bg-zinc-900/40 p-1.5">
        {TABS.map((t) => {
          const active = t.id === tab;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`flex min-h-[36px] flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                active
                  ? "bg-cyan-500/20 text-cyan-300 ring-1 ring-cyan-500/40"
                  : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
              }`}
            >
              {t.label}
              <span
                className={`rounded-md px-1.5 text-[10px] ${
                  active ? "bg-cyan-500/30 text-cyan-200" : "bg-zinc-800 text-zinc-400"
                }`}
              >
                {counts[t.id]}
              </span>
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-8 text-center">
          <div className="text-3xl text-zinc-600">☐</div>
          <p className="mt-2 text-sm text-zinc-300">Nothing here yet.</p>
          <p className="text-xs text-zinc-500">Add a book above.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {filtered.map((b) => (
            <BookCard key={b.id} book={b} />
          ))}
        </ul>
      )}
    </div>
  );
}

function AddBookForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);

  function submit(formData: FormData) {
    const title = String(formData.get("title") || "").trim();
    const author = String(formData.get("author") || "").trim();
    if (!title) return;
    start(async () => {
      await addBookAction(title, author);
      formRef.current?.reset();
      setOpen(false);
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-11 w-full items-center justify-center rounded-xl bg-cyan-500 text-sm font-semibold text-zinc-950 hover:bg-cyan-400"
      >
        + Add book
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
        placeholder="Title"
        required
        className="w-full rounded-lg bg-zinc-900 px-3 py-2 text-base text-zinc-100 placeholder:text-zinc-500 outline-none ring-1 ring-zinc-800 focus:ring-cyan-500/50"
      />
      <input
        name="author"
        autoComplete="off"
        placeholder="Author"
        className="w-full rounded-lg bg-zinc-900 px-3 py-2 text-base text-zinc-100 placeholder:text-zinc-500 outline-none ring-1 ring-zinc-800 focus:ring-cyan-500/50"
      />
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="flex-1 rounded-lg bg-zinc-800 px-3 py-2 text-sm font-semibold text-zinc-300 hover:bg-zinc-700"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={pending}
          className="flex-1 rounded-lg bg-cyan-500 px-3 py-2 text-sm font-semibold text-zinc-950 hover:bg-cyan-400 disabled:opacity-50"
        >
          {pending ? "Adding…" : "Add"}
        </button>
      </div>
    </form>
  );
}

function BookCard({ book }: { book: BookRow }) {
  const [pending, start] = useTransition();
  const [statusOpen, setStatusOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [notesDraft, setNotesDraft] = useState(book.notes || "");
  const [editingNotes, setEditingNotes] = useState(false);
  const [editingProgress, setEditingProgress] = useState(false);
  const [curDraft, setCurDraft] = useState(
    book.current_page != null ? String(book.current_page) : ""
  );
  const [totDraft, setTotDraft] = useState(
    book.total_pages != null ? String(book.total_pages) : ""
  );
  const [editingDates, setEditingDates] = useState(false);
  const [startDraft, setStartDraft] = useState(book.started_at || "");
  const [finishDraft, setFinishDraft] = useState(book.finished_at || "");

  function saveProgress() {
    const cur = curDraft.trim() === "" ? null : Number(curDraft);
    const tot = totDraft.trim() === "" ? null : Number(totDraft);
    start(async () => {
      await updateProgressAction(book.id, cur, tot);
      setEditingProgress(false);
    });
  }
  function saveDates() {
    start(async () => {
      await updateDatesAction(
        book.id,
        startDraft.trim() || null,
        finishDraft.trim() || null
      );
      setEditingDates(false);
    });
  }

  function changeStatus(status: BookStatus) {
    setStatusOpen(false);
    if (status === book.status) return;
    start(() => updateStatusAction(book.id, status));
  }
  function setRating(rating: number) {
    const next = book.rating === rating ? 0 : rating;
    start(() => rateBookAction(book.id, next));
  }
  function remove() {
    if (!confirm("Delete this book?")) return;
    start(() => deleteBookAction(book.id));
  }
  function saveNotes() {
    start(async () => {
      await updateNotesAction(book.id, notesDraft);
      setEditingNotes(false);
    });
  }

  const statusLabel =
    TABS.find((t) => t.id === book.status)?.label || book.status;

  const notesPreview =
    book.notes && book.notes.length > 140
      ? book.notes.slice(0, 140) + "…"
      : book.notes;

  const pct =
    book.total_pages && book.total_pages > 0 && book.current_page != null
      ? Math.min(100, Math.round((book.current_page / book.total_pages) * 100))
      : null;

  const startedFmt = fmtDate(book.started_at);
  const finishedFmt = fmtDate(book.finished_at);
  const span = daysBetween(book.started_at, book.finished_at);

  return (
    <li
      className={`rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 ${
        pending ? "opacity-50" : ""
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="break-words text-base font-semibold text-zinc-100">
            {book.title}
          </h3>
          {book.author && (
            <p className="mt-0.5 break-words text-xs text-zinc-400">
              by {book.author}
            </p>
          )}
        </div>
        <div className="relative">
          <button
            type="button"
            onClick={() => setStatusOpen((v) => !v)}
            aria-label="Change status"
            className="flex min-h-[36px] items-center gap-1 rounded-lg bg-zinc-800/60 px-1.5 py-1 hover:bg-zinc-700"
          >
            <StatusPill label={statusLabel} tone={statusTone(book.status)} />
            <span className="text-xs text-zinc-400">▾</span>
          </button>
          {statusOpen && (
            <div className="absolute right-0 z-20 mt-1 w-36 overflow-hidden rounded-xl border border-zinc-700 bg-zinc-900 shadow-lg">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => changeStatus(t.id)}
                  className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-zinc-800 ${
                    t.id === book.status ? "text-cyan-300" : "text-zinc-200"
                  }`}
                >
                  {t.label}
                  {t.id === book.status && <span>✓</span>}
                </button>
              ))}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={remove}
          aria-label="Delete book"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-800 hover:text-red-400"
        >
          <span className="text-lg leading-none">×</span>
        </button>
      </div>

      {book.status === "reading" && (
        <div className="mt-3">
          {editingProgress ? (
            <div className="space-y-2 rounded-xl bg-zinc-900/60 p-2.5 ring-1 ring-zinc-800">
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={curDraft}
                  onChange={(e) => setCurDraft(e.target.value)}
                  placeholder="Page"
                  aria-label="Current page"
                  className="w-20 rounded-lg bg-zinc-900 px-2.5 py-1.5 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none ring-1 ring-zinc-800 focus:ring-cyan-500/50"
                />
                <span className="text-sm text-zinc-500">of</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={totDraft}
                  onChange={(e) => setTotDraft(e.target.value)}
                  placeholder="Total"
                  aria-label="Total pages"
                  className="w-20 rounded-lg bg-zinc-900 px-2.5 py-1.5 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none ring-1 ring-zinc-800 focus:ring-cyan-500/50"
                />
                <span className="text-xs text-zinc-500">pages</span>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setCurDraft(
                      book.current_page != null ? String(book.current_page) : ""
                    );
                    setTotDraft(
                      book.total_pages != null ? String(book.total_pages) : ""
                    );
                    setEditingProgress(false);
                  }}
                  className="flex-1 rounded-lg bg-zinc-800 px-3 py-2 text-xs font-semibold text-zinc-300 hover:bg-zinc-700"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveProgress}
                  disabled={pending}
                  className="flex-1 rounded-lg bg-cyan-500 px-3 py-2 text-xs font-semibold text-zinc-950 hover:bg-cyan-400 disabled:opacity-50"
                >
                  Save
                </button>
              </div>
            </div>
          ) : pct != null ? (
            <button
              type="button"
              onClick={() => setEditingProgress(true)}
              className="flex w-full items-center gap-3 rounded-xl text-left"
            >
              <Ring pct={pct / 100} size={56} stroke={6} tone="cyan">
                <span className="text-xs font-bold text-cyan-300">{pct}%</span>
              </Ring>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-zinc-200">
                  p.{book.current_page} / {book.total_pages}
                </div>
                <div className="mt-0.5 text-[11px] uppercase tracking-wider text-zinc-500">
                  Pages read
                </div>
              </div>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setEditingProgress(true)}
              className="text-xs font-semibold text-zinc-500 hover:text-zinc-300"
            >
              + Track progress
            </button>
          )}
        </div>
      )}

      <div className="mt-3">
        {editingDates ? (
          <div className="space-y-2 rounded-xl bg-zinc-900/60 p-2.5 ring-1 ring-zinc-800">
            <label className="flex items-center justify-between gap-2 text-xs text-zinc-400">
              <span className="uppercase tracking-wider">Started</span>
              <input
                type="date"
                value={startDraft}
                onChange={(e) => setStartDraft(e.target.value)}
                className="rounded-lg bg-zinc-900 px-2.5 py-1.5 text-sm text-zinc-100 outline-none ring-1 ring-zinc-800 focus:ring-cyan-500/50"
              />
            </label>
            <label className="flex items-center justify-between gap-2 text-xs text-zinc-400">
              <span className="uppercase tracking-wider">Finished</span>
              <input
                type="date"
                value={finishDraft}
                onChange={(e) => setFinishDraft(e.target.value)}
                className="rounded-lg bg-zinc-900 px-2.5 py-1.5 text-sm text-zinc-100 outline-none ring-1 ring-zinc-800 focus:ring-cyan-500/50"
              />
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setStartDraft(book.started_at || "");
                  setFinishDraft(book.finished_at || "");
                  setEditingDates(false);
                }}
                className="flex-1 rounded-lg bg-zinc-800 px-3 py-2 text-xs font-semibold text-zinc-300 hover:bg-zinc-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveDates}
                disabled={pending}
                className="flex-1 rounded-lg bg-cyan-500 px-3 py-2 text-xs font-semibold text-zinc-950 hover:bg-cyan-400 disabled:opacity-50"
              >
                Save
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setEditingDates(true)}
            className="text-xs text-zinc-500 hover:text-zinc-300"
          >
            {startedFmt || finishedFmt ? (
              <span>
                {startedFmt && <>Started {startedFmt}</>}
                {startedFmt && finishedFmt && " · "}
                {finishedFmt && <>Finished {finishedFmt}</>}
                {span != null && (
                  <span className="text-zinc-600">
                    {" "}
                    ({span} day{span === 1 ? "" : "s"})
                  </span>
                )}
              </span>
            ) : (
              <span className="font-semibold">+ Add dates</span>
            )}
          </button>
        )}
      </div>

      {book.status === "completed" && (
        <div className="mt-3 flex items-center gap-1.5">
          <span className="text-xs uppercase tracking-wider text-zinc-500">
            Rating
          </span>
          <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map((n) => {
              const filled = (book.rating || 0) >= n;
              return (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRating(n)}
                  aria-label={`Rate ${n} star${n > 1 ? "s" : ""}`}
                  className={`flex h-9 w-9 items-center justify-center rounded-lg text-lg transition ${
                    filled
                      ? "text-amber-400"
                      : "text-zinc-600 hover:text-zinc-400"
                  }`}
                >
                  {filled ? "★" : "☆"}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-3">
        {editingNotes ? (
          <div className="space-y-2">
            <textarea
              value={notesDraft}
              onChange={(e) => setNotesDraft(e.target.value)}
              rows={5}
              placeholder="Notes…"
              className="w-full resize-none rounded-lg bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none ring-1 ring-zinc-800 focus:ring-cyan-500/50"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setNotesDraft(book.notes || "");
                  setEditingNotes(false);
                }}
                className="flex-1 rounded-lg bg-zinc-800 px-3 py-2 text-xs font-semibold text-zinc-300 hover:bg-zinc-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveNotes}
                disabled={pending}
                className="flex-1 rounded-lg bg-cyan-500 px-3 py-2 text-xs font-semibold text-zinc-950 hover:bg-cyan-400 disabled:opacity-50"
              >
                Save
              </button>
            </div>
          </div>
        ) : book.notes ? (
          <div>
            <p
              onClick={() => setNotesOpen((v) => !v)}
              className="cursor-pointer whitespace-pre-wrap break-words text-sm text-zinc-300"
            >
              {notesOpen ? book.notes : notesPreview}
            </p>
            <div className="mt-1 flex gap-3 text-xs">
              {book.notes.length > 140 && (
                <button
                  type="button"
                  onClick={() => setNotesOpen((v) => !v)}
                  className="font-semibold text-cyan-400 hover:text-cyan-300"
                >
                  {notesOpen ? "Show less" : "Read more"}
                </button>
              )}
              <button
                type="button"
                onClick={() => setEditingNotes(true)}
                className="font-semibold text-zinc-500 hover:text-zinc-300"
              >
                Edit notes
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setEditingNotes(true)}
            className="text-xs font-semibold text-zinc-500 hover:text-zinc-300"
          >
            + Add notes
          </button>
        )}
      </div>
    </li>
  );
}
