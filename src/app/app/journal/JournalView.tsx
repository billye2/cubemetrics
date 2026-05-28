"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { deleteEntryAction } from "./actions";

interface Entry {
  id: number;
  title: string | null;
  body: string;
  mood: string | null;
  entry_date: string;
  created_at: string;
}

export function JournalView({ entries }: { entries: Entry[] }) {
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

  return (
    <div>
      <NewEntryButton />
      <ul className="mt-4 space-y-3">
        {entries.map((e) => (
          <EntryCard key={e.id} entry={e} />
        ))}
      </ul>
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

  return (
    <li className={`rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 ${pending ? "opacity-50" : ""}`}>
      <div className="mb-1 flex items-center justify-between gap-2 text-xs text-zinc-500">
        <span>{date}</span>
        <div className="flex items-center gap-2">
          {entry.mood && (
            <span className="rounded-md bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-300">{entry.mood}</span>
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
      {entry.title && (
        <h3 className="mb-1 text-base font-semibold text-zinc-100">{entry.title}</h3>
      )}
      <p
        onClick={() => setExpanded((v) => !v)}
        className="whitespace-pre-wrap break-words text-sm text-zinc-300"
      >
        {expanded ? entry.body : preview}
      </p>
      {entry.body.length > 200 && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-2 text-xs font-semibold text-cyan-400 hover:text-cyan-300"
        >
          {expanded ? "Show less" : "Read more"}
        </button>
      )}
    </li>
  );
}
