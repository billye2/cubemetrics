"use client";

import { useRef, useState, useTransition } from "react";
import { logbookAddAction, logbookDeleteAction } from "./actions";
import type { FactoryConfig } from "@/lib/modern/catalog";

interface LogEntry {
  id: number;
  title: string | null;
  body: string;
  created_at: string;
}

export function LogbookView({
  appId,
  config,
  entries,
}: {
  appId: string;
  config: FactoryConfig;
  entries: LogEntry[];
}) {
  const logType = config.logType!;
  const [showForm, setShowForm] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, start] = useTransition();

  function submit(formData: FormData) {
    const body = String(formData.get("body") || "").trim();
    const title = String(formData.get("title") || "").trim();
    if (!body) return;
    start(async () => {
      await logbookAddAction(appId, logType, title, body);
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
          + New {(config.entryLabel ?? "entry").toLowerCase()}
        </button>
      ) : (
        <form ref={formRef} action={submit} className="space-y-2 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-3">
          {config.hasTitle && (
            <input
              name="title"
              autoComplete="off"
              placeholder="Title"
              className="w-full rounded-lg bg-zinc-900 px-3 py-2 text-base text-zinc-100 placeholder:text-zinc-500 outline-none ring-1 ring-zinc-800 focus:ring-cyan-500/50"
            />
          )}
          <textarea
            name="body"
            required
            autoFocus
            placeholder="What happened?"
            rows={6}
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

      {entries.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-8 text-center">
          <p className="text-sm text-zinc-400">No entries yet.</p>
        </div>
      ) : (
        <ul className="mt-4 space-y-3">
          {entries.map((e) => (
            <EntryCard key={e.id} appId={appId} entry={e} />
          ))}
        </ul>
      )}
    </div>
  );
}

function EntryCard({ appId, entry }: { appId: string; entry: LogEntry }) {
  const [expanded, setExpanded] = useState(false);
  const [pending, start] = useTransition();
  const date = new Date(entry.created_at).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const preview = entry.body.length > 200 ? entry.body.slice(0, 200) + "…" : entry.body;

  function remove() {
    if (!confirm("Delete this entry?")) return;
    start(() => logbookDeleteAction(appId, entry.id));
  }

  return (
    <li className={`rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 ${pending ? "opacity-50" : ""}`}>
      <div className="mb-1 flex items-center justify-between text-xs text-zinc-500">
        <span>{date}</span>
        <button
          type="button"
          onClick={remove}
          className="rounded-lg p-1 text-zinc-600 hover:bg-zinc-800 hover:text-red-400"
        >
          ×
        </button>
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
