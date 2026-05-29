"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { logbookAddAction, logbookUpdateAction, logbookDeleteAction } from "./actions";
import type { FactoryConfig } from "@/lib/modern/catalog";
import { countWithinDays } from "./factoryLib";
import { renderMarkdown } from "./markdown";

interface LogEntry {
  id: number;
  title: string | null;
  body: string;
  created_at: string;
}

// Per-log-type prompts so the body field guides the entry instead of a generic placeholder.
const PROMPTS: Record<string, string> = {
  gratitude: "Three things you're grateful for…",
  meeting: "Agenda, notes, decisions…",
  standup: "Yesterday · Today · Blockers",
  brainstorm: "Dump every idea — don't filter…",
  decision: "Options, criteria, what you chose and why…",
  workout: "Exercises — sets × reps × weight…",
  learning: "What you learned and how you'll use it…",
  weekly: "Wins · Misses · Next week…",
  feedbacklog: "Feedback given/received, to whom, context…",
  oneonone: "Topics, action items, follow-ups…",
  retro: "Went well · Didn't · Try next…",
  recipe: "Ingredients, steps, servings, cook time…",
  brag: "What you shipped or achieved — impact, numbers, who noticed…",
  interview: "Company, who you met, questions asked, how it went, follow-ups…",
};

function monthKey(d: Date): string {
  return d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
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
  const entryLabel = (config.entryLabel ?? "entry").toLowerCase();
  const prompt = PROMPTS[logType] ?? "What happened?";
  const [showForm, setShowForm] = useState(false);
  const [query, setQuery] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, start] = useTransition();

  const thisWeek = useMemo(
    () => countWithinDays(entries.map((e) => e.created_at), 7),
    [entries],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter(
      (e) => e.body.toLowerCase().includes(q) || (e.title ?? "").toLowerCase().includes(q),
    );
  }, [entries, query]);

  // Group filtered entries by month (entries arrive newest-first).
  const groups = useMemo(() => {
    const out: { key: string; entries: LogEntry[] }[] = [];
    for (const e of filtered) {
      const key = monthKey(new Date(e.created_at));
      const last = out[out.length - 1];
      if (last && last.key === key) last.entries.push(e);
      else out.push({ key, entries: [e] });
    }
    return out;
  }, [filtered]);

  function submit(formData: FormData) {
    const body = String(formData.get("body") || "").trim();
    const title = String(formData.get("title") || "").trim();
    const date = String(formData.get("entry_date") || "").trim();
    if (!body) return;
    // Backdate by anchoring to local noon so the calendar day is preserved.
    const createdAt = date ? `${date}T12:00:00` : null;
    start(async () => {
      await logbookAddAction(appId, logType, title, body, createdAt);
      formRef.current?.reset();
      setShowForm(false);
    });
  }

  return (
    <div>
      {entries.length > 0 && (
        <div className="mb-4 grid grid-cols-2 gap-3">
          <Stat label="Total" value={String(entries.length)} />
          <Stat label="This week" value={String(thisWeek)} />
        </div>
      )}

      {!showForm ? (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="flex h-11 w-full items-center justify-center rounded-xl bg-cyan-500 text-sm font-semibold text-zinc-950 hover:bg-cyan-400"
        >
          + New {entryLabel}
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
            placeholder={prompt}
            rows={6}
            className="w-full resize-none rounded-lg bg-zinc-900 px-3 py-2 text-base text-zinc-100 placeholder:text-zinc-500 outline-none ring-1 ring-zinc-800 focus:ring-cyan-500/50"
          />
          <label className="block text-[11px] uppercase tracking-wider text-zinc-500">
            Date (optional — backdate a missed entry)
            <input
              name="entry_date"
              type="date"
              className="mt-1 w-full rounded-lg bg-zinc-900 px-3 py-2 text-base text-zinc-100 outline-none ring-1 ring-zinc-800 focus:ring-cyan-500/50"
            />
          </label>
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

      {entries.length > 3 && (
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search entries…"
          className="mt-4 w-full rounded-lg bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none ring-1 ring-zinc-800 focus:ring-cyan-500/50"
        />
      )}

      {entries.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-8 text-center">
          <p className="text-sm text-zinc-400">No entries yet.</p>
        </div>
      ) : filtered.length === 0 ? (
        <p className="mt-6 text-center text-sm text-zinc-500">No entries match “{query}”.</p>
      ) : (
        <div className="mt-4 space-y-5">
          {groups.map((group) => (
            <div key={group.key}>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">{group.key}</h3>
                <span className="text-xs text-zinc-600">{group.entries.length}</span>
              </div>
              <ul className="space-y-3">
                {group.entries.map((e) => (
                  <EntryCard key={e.id} appId={appId} entry={e} hasTitle={!!config.hasTitle} />
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-3 text-center">
      <div className="text-xl font-bold tracking-tight text-cyan-400">{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-zinc-500">{label}</div>
    </div>
  );
}

function EntryCard({ appId, entry, hasTitle }: { appId: string; entry: LogEntry; hasTitle: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [pending, start] = useTransition();
  const titleRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  const date = new Date(entry.created_at).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const preview = entry.body.length > 200 ? entry.body.slice(0, 200) + "…" : entry.body;

  function remove() {
    if (!confirm("Delete this entry?")) return;
    start(() => logbookDeleteAction(appId, entry.id));
  }

  function save() {
    const body = (bodyRef.current?.value || "").trim();
    if (!body) return;
    const title = titleRef.current?.value.trim() ?? entry.title ?? "";
    start(async () => {
      await logbookUpdateAction(appId, entry.id, title, body);
      setEditing(false);
    });
  }

  if (editing) {
    return (
      <li className={`rounded-2xl border border-cyan-500/30 bg-zinc-900/40 p-4 ${pending ? "opacity-50" : ""}`}>
        {hasTitle && (
          <input
            ref={titleRef}
            defaultValue={entry.title ?? ""}
            placeholder="Title"
            className="mb-2 w-full rounded-lg bg-zinc-900 px-3 py-2 text-base text-zinc-100 placeholder:text-zinc-500 outline-none ring-1 ring-zinc-800 focus:ring-cyan-500/50"
          />
        )}
        <textarea
          ref={bodyRef}
          defaultValue={entry.body}
          rows={6}
          className="w-full resize-none rounded-lg bg-zinc-900 px-3 py-2 text-base text-zinc-100 outline-none ring-1 ring-zinc-800 focus:ring-cyan-500/50"
        />
        <div className="mt-2 flex gap-2">
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
            className="flex-1 rounded-lg bg-cyan-500 px-3 py-2 text-sm font-semibold text-zinc-950 hover:bg-cyan-400"
          >
            Save
          </button>
        </div>
      </li>
    );
  }

  return (
    <li className={`rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 ${pending ? "opacity-50" : ""}`}>
      <div className="mb-1 flex items-center justify-between text-xs text-zinc-500">
        <span>{date}</span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="rounded-lg px-2 py-1 text-zinc-500 hover:bg-zinc-800 hover:text-cyan-300"
          >
            Edit
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
      {entry.title && <h3 className="mb-1 text-base font-semibold text-zinc-100">{entry.title}</h3>}
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
    </li>
  );
}
