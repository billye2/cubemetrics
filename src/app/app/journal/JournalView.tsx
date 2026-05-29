"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { deleteEntryAction, updateEntryAction } from "./actions";
import { renderMarkdown } from "../_factories/markdown";

const MOODS = ["😊", "😌", "😐", "😔", "😤", "😴", "🤔"];

interface Entry {
  id: number;
  title: string | null;
  body: string;
  mood: string | null;
  entry_date: string;
  created_at: string;
}

export function JournalView({ entries }: { entries: Entry[] }) {
  const [query, setQuery] = useState("");

  if (entries.length === 0) {
    return (
      <div>
        <NewEntryButton />
        <div className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-8 text-center">
          <div className="text-3xl text-zinc-600">✎</div>
          <p className="mt-2 text-sm text-zinc-300">No entries yet.</p>
          <p className="text-xs text-zinc-500">Tap “New entry” to start.</p>
        </div>
      </div>
    );
  }

  const q = query.trim().toLowerCase();
  const filtered = q
    ? entries.filter(
        (e) => e.body.toLowerCase().includes(q) || (e.title ?? "").toLowerCase().includes(q),
      )
    : entries;

  return (
    <div>
      <NewEntryButton />
      {entries.length > 3 && (
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search entries…"
          className="mt-4 w-full rounded-lg bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none ring-1 ring-zinc-800 focus:ring-cyan-500/50"
        />
      )}
      {filtered.length === 0 ? (
        <p className="mt-6 text-center text-sm text-zinc-500">No entries match “{query}”.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {filtered.map((e) => (
            <EntryCard key={e.id} entry={e} />
          ))}
        </ul>
      )}
    </div>
  );
}

function NewEntryButton() {
  return (
    <Link
      href="/app/journal/new"
      className="flex h-11 items-center justify-center rounded-xl bg-cyan-500 px-5 text-sm font-semibold text-zinc-950 hover:bg-cyan-400 active:scale-[0.98]"
    >
      + New entry
    </Link>
  );
}

function EntryCard({ entry }: { entry: Entry }) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(entry.title ?? "");
  const [body, setBody] = useState(entry.body);
  const [mood, setMood] = useState(entry.mood ?? "");
  const [pending, start] = useTransition();
  const date = new Date(entry.entry_date || entry.created_at).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const preview = entry.body.length > 200 ? entry.body.slice(0, 200) + "…" : entry.body;

  function remove() {
    if (!confirm("Delete this entry?")) return;
    start(() => deleteEntryAction(entry.id));
  }
  function openEdit() {
    setTitle(entry.title ?? "");
    setBody(entry.body);
    setMood(entry.mood ?? "");
    setEditing(true);
  }
  function save() {
    if (!body.trim()) return;
    start(async () => {
      await updateEntryAction(entry.id, title, body, mood || null);
      setEditing(false);
    });
  }

  return (
    <li className={`rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 ${pending ? "opacity-50" : ""}`}>
      <div className="mb-1 flex items-center justify-between gap-2 text-xs text-zinc-500">
        <span>{date}</span>
        <div className="flex items-center gap-2">
          {entry.mood && !editing && (
            <span className="rounded-md bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-300">{entry.mood}</span>
          )}
          {!editing && (
            <button
              type="button"
              onClick={openEdit}
              aria-label="Edit entry"
              className="rounded-lg p-1 text-zinc-600 hover:bg-zinc-800 hover:text-cyan-400"
            >
              ✎
            </button>
          )}
          <button
            type="button"
            onClick={remove}
            aria-label="Delete"
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
            rows={Math.min(14, Math.max(5, body.split("\n").length + 1))}
            placeholder="Write…"
            className="w-full resize-none rounded-lg bg-zinc-900 px-3 py-2 text-base text-zinc-100 placeholder:text-zinc-500 outline-none ring-1 ring-zinc-800 focus:ring-cyan-500/50"
          />
          <div className="flex flex-wrap gap-1.5">
            {MOODS.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMood((cur) => (cur === m ? "" : m))}
                aria-label={`Mood ${m}`}
                className={`flex h-9 w-9 items-center justify-center rounded-lg text-lg ring-1 transition ${
                  mood === m ? "bg-cyan-500/20 ring-cyan-500/50" : "bg-zinc-900 ring-zinc-800 hover:ring-zinc-700"
                }`}
              >
                {m}
              </button>
            ))}
          </div>
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
              disabled={pending || !body.trim()}
              className="flex-1 rounded-lg bg-cyan-500 px-3 py-2 text-sm font-semibold text-zinc-950 hover:bg-cyan-400 disabled:opacity-50"
            >
              {pending ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      ) : (
        <>
          {entry.title && (
            <h3 className="mb-1 text-base font-semibold text-zinc-100">{entry.title}</h3>
          )}
          {entry.body.length > 200 && !expanded ? (
            <p
              onClick={() => setExpanded(true)}
              className="cursor-pointer whitespace-pre-wrap break-words text-sm text-zinc-300"
            >
              {preview}
            </p>
          ) : (
            renderMarkdown(entry.body)
          )}
          {entry.body.length > 200 && (
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
