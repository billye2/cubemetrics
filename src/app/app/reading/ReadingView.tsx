"use client";

import { useRef, useState, useTransition } from "react";
import type { BookRow, BookStatus } from "./page";
import {
  addBookAction,
  deleteBookAction,
  rateBookAction,
  updateNotesAction,
  updateStatusAction,
} from "./actions";

const TABS: { id: BookStatus; label: string }[] = [
  { id: "reading", label: "Reading" },
  { id: "to_read", label: "To Read" },
  { id: "completed", label: "Completed" },
  { id: "dropped", label: "Dropped" },
];

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
            className="min-h-[36px] rounded-lg bg-zinc-800 px-2.5 py-1 text-xs font-semibold text-zinc-200 hover:bg-zinc-700"
          >
            {statusLabel} ▾
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
