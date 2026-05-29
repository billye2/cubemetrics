"use client";

import { useRef, useState, useTransition } from "react";
import { addNoteAction, deleteNoteAction, togglePinAction, updateNoteAction } from "./actions";
import { renderMarkdown } from "../_factories/markdown";

interface Note {
  id: number;
  title: string | null;
  body: string;
  pinned: boolean;
  updated_at: string;
}

export function NotesView({ notes }: { notes: Note[] }) {
  const [showForm, setShowForm] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, start] = useTransition();
  const pinned = notes.filter((n) => n.pinned);
  const rest = notes.filter((n) => !n.pinned);

  function submit(formData: FormData) {
    start(async () => {
      await addNoteAction(formData);
      formRef.current?.reset();
      setShowForm(false);
    });
  }

  return (
    <div>
      {!showForm ? (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="flex h-11 w-full items-center justify-center rounded-xl bg-cyan-500 text-sm font-semibold text-zinc-950 hover:bg-cyan-400"
        >
          + New note
        </button>
      ) : (
        <form ref={formRef} action={submit} className="space-y-2 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-3">
          <input
            name="title"
            autoComplete="off"
            placeholder="Title (optional)"
            className="w-full rounded-lg bg-zinc-900 px-3 py-2 text-base text-zinc-100 placeholder:text-zinc-500 outline-none ring-1 ring-zinc-800 focus:ring-cyan-500/50"
          />
          <textarea
            name="body"
            required
            autoFocus
            placeholder="Note…"
            rows={8}
            className="w-full resize-none rounded-lg bg-zinc-900 px-3 py-2 text-base text-zinc-100 placeholder:text-zinc-500 outline-none ring-1 ring-zinc-800 focus:ring-cyan-500/50"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="flex-1 rounded-lg bg-zinc-800 px-3 py-2 text-sm font-semibold text-zinc-300 hover:bg-zinc-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending}
              className="flex-1 rounded-lg bg-cyan-500 px-3 py-2 text-sm font-semibold text-zinc-950 hover:bg-cyan-400 disabled:opacity-50"
            >
              {pending ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      )}

      {notes.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-8 text-center">
          <p className="text-sm text-zinc-400">No notes yet.</p>
        </div>
      ) : (
        <>
          {pinned.length > 0 && (
            <div className="mt-6">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">Pinned</h3>
              <ul className="space-y-3">
                {pinned.map((n) => (
                  <NoteCard key={n.id} note={n} />
                ))}
              </ul>
            </div>
          )}
          {rest.length > 0 && (
            <div className="mt-6">
              {pinned.length > 0 && (
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">Other</h3>
              )}
              <ul className="space-y-3">
                {rest.map((n) => (
                  <NoteCard key={n.id} note={n} />
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function NoteCard({ note }: { note: Note }) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(note.title ?? "");
  const [body, setBody] = useState(note.body);
  const [pending, start] = useTransition();
  const date = new Date(note.updated_at).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const preview = note.body.length > 200 ? note.body.slice(0, 200) + "…" : note.body;

  function remove() {
    if (!confirm("Delete this note?")) return;
    start(() => deleteNoteAction(note.id));
  }
  function togglePin() {
    start(() => togglePinAction(note.id, !note.pinned));
  }
  function openEdit() {
    setTitle(note.title ?? "");
    setBody(note.body);
    setEditing(true);
  }
  function save() {
    if (!title.trim() && !body.trim()) return;
    start(async () => {
      await updateNoteAction(note.id, title, body);
      setEditing(false);
    });
  }

  return (
    <li className={`rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 ${pending ? "opacity-50" : ""}`}>
      <div className="mb-1 flex items-center justify-between gap-2 text-xs text-zinc-500">
        <span>{date}</span>
        <div className="flex items-center gap-1">
          {!editing && (
            <button
              type="button"
              onClick={openEdit}
              aria-label="Edit note"
              className="rounded-lg p-1 text-zinc-600 hover:bg-zinc-800 hover:text-cyan-400"
            >
              ✎
            </button>
          )}
          <button
            type="button"
            onClick={togglePin}
            aria-label={note.pinned ? "Unpin" : "Pin"}
            className={`rounded-lg p-1 ${note.pinned ? "text-amber-400" : "text-zinc-600 hover:text-zinc-300"}`}
          >
            ★
          </button>
          <button
            type="button"
            onClick={remove}
            className="rounded-lg p-1 text-zinc-600 hover:bg-zinc-800 hover:text-red-400"
          >
            ×
          </button>
        </div>
      </div>

      {editing ? (
        <div className="space-y-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoComplete="off"
            placeholder="Title (optional)"
            className="w-full rounded-lg bg-zinc-900 px-3 py-2 text-base text-zinc-100 placeholder:text-zinc-500 outline-none ring-1 ring-zinc-800 focus:ring-cyan-500/50"
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            autoFocus
            rows={Math.min(12, Math.max(4, body.split("\n").length + 1))}
            placeholder="Note…"
            className="w-full resize-none rounded-lg bg-zinc-900 px-3 py-2 text-base text-zinc-100 placeholder:text-zinc-500 outline-none ring-1 ring-zinc-800 focus:ring-cyan-500/50"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="flex-1 rounded-lg bg-zinc-800 px-3 py-2 text-sm font-semibold text-zinc-300 hover:bg-zinc-700"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={save}
              disabled={pending || (!title.trim() && !body.trim())}
              className="flex-1 rounded-lg bg-cyan-500 px-3 py-2 text-sm font-semibold text-zinc-950 hover:bg-cyan-400 disabled:opacity-50"
            >
              {pending ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      ) : (
        <>
          {note.title && (
            <h3 className="mb-1 text-base font-semibold text-zinc-100">{note.title}</h3>
          )}
          {note.body.length > 200 && !expanded ? (
            <p
              onClick={() => setExpanded(true)}
              className="cursor-pointer whitespace-pre-wrap break-words text-sm text-zinc-300"
            >
              {preview}
            </p>
          ) : (
            renderMarkdown(note.body)
          )}
          {note.body.length > 200 && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="mt-2 text-xs font-semibold text-cyan-400 hover:text-cyan-300"
            >
              {expanded ? "Show less" : "Read more"}
            </button>
          )}
        </>
      )}
    </li>
  );
}
