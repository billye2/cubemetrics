"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import {
  checklistAddAction,
  checklistToggleAction,
  checklistDeleteAction,
  checklistReorderAction,
  checklistSetDueAction,
} from "./actions";
import type { FactoryConfig } from "@/lib/modern/catalog";

interface Item {
  id: number;
  title: string;
  note: string | null;
  completed: boolean;
  sort_order: number;
  created_at: string;
  due_date: string | null;
}

type SortMode = "newest" | "alpha" | "active" | "manual" | "due";

const SORTS: { id: SortMode; label: string }[] = [
  { id: "active", label: "To do first" },
  { id: "due", label: "Due" },
  { id: "newest", label: "Newest" },
  { id: "alpha", label: "A–Z" },
  { id: "manual", label: "Manual" },
];

/** Local-today YYYY-MM-DD (en-CA renders ISO-like). */
function todayKey(): string {
  return new Date().toLocaleDateString("en-CA");
}

/** Relative label + tone for a due date, or null when undated. */
function dueMeta(due: string | null): { label: string; tone: string } | null {
  if (!due) return null;
  const d = due.slice(0, 10);
  const today = todayKey();
  const date = new Date(d + "T00:00:00");
  const short = date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  if (d < today) return { label: `Overdue · ${short}`, tone: "text-red-400" };
  if (d === today) return { label: "Today", tone: "text-amber-400" };
  return { label: short, tone: "text-zinc-400" };
}

export function ChecklistView({
  appId,
  config,
  items,
}: {
  appId: string;
  config: FactoryConfig;
  items: Item[];
}) {
  const listType = config.listType!;
  const itemLabel = (config.itemLabel ?? "item").toLowerCase();
  const formRef = useRef<HTMLFormElement>(null);
  const noteRef = useRef<HTMLInputElement>(null);
  const [pending, start] = useTransition();
  const [showDone, setShowDone] = useState(false);
  const [sort, setSort] = useState<SortMode>("active");
  const [showNote, setShowNote] = useState(false);

  const total = items.length;
  const doneCount = items.filter((i) => i.completed).length;
  const pct = total > 0 ? Math.round((doneCount / total) * 100) : 0;

  const sorted = useMemo(() => {
    const copy = [...items];
    if (sort === "alpha") copy.sort((a, b) => a.title.localeCompare(b.title));
    else if (sort === "newest") copy.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
    else if (sort === "due")
      copy.sort((a, b) => {
        if (a.due_date === b.due_date) return a.created_at < b.created_at ? 1 : -1;
        if (!a.due_date) return 1; // undated last
        if (!b.due_date) return -1;
        return a.due_date < b.due_date ? -1 : 1; // soonest first
      });
    else if (sort === "manual")
      copy.sort((a, b) => a.sort_order - b.sort_order || (a.created_at < b.created_at ? -1 : 1));
    return copy;
  }, [items, sort]);

  const active = sorted.filter((i) => !i.completed);
  const done = sorted.filter((i) => i.completed);

  function submit(formData: FormData) {
    const title = String(formData.get("title") || "");
    if (!title.trim()) return;
    const note = String(formData.get("note") || "");
    const due = String(formData.get("due_date") || "");
    start(async () => {
      await checklistAddAction(appId, listType, title, note, due);
      formRef.current?.reset();
      setShowNote(false);
    });
  }

  function move(id: number, direction: "up" | "down") {
    start(() => checklistReorderAction(appId, listType, id, direction));
  }

  return (
    <div>
      {total > 0 && (
        <div className="mb-4 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
          <div className="mb-2 flex items-center justify-between text-xs">
            <span className="font-semibold text-zinc-300">
              {doneCount} of {total} done
            </span>
            <span className="font-semibold text-cyan-400">{pct}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
            <div
              className={`h-full rounded-full transition-all ${pct === 100 ? "bg-emerald-500" : "bg-cyan-500"}`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}

      <form
        ref={formRef}
        action={submit}
        className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-2"
      >
        <div className="flex items-center gap-2">
          <input
            name="title"
            autoComplete="off"
            placeholder={`Add ${itemLabel}…`}
            className="flex-1 bg-transparent px-2 py-2 text-base text-zinc-100 placeholder:text-zinc-500 outline-none"
          />
          <button
            type="button"
            onClick={() => {
              setShowNote((v) => !v);
              setTimeout(() => noteRef.current?.focus(), 0);
            }}
            aria-label="Add detail"
            className={`rounded-lg px-2 py-2 text-sm ${showNote ? "text-cyan-400" : "text-zinc-500 hover:text-zinc-300"}`}
          >
            ＋
          </button>
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-cyan-400 disabled:opacity-50"
          >
            Add
          </button>
        </div>
        {showNote && (
          <div className="mt-1 flex flex-col gap-1 sm:flex-row sm:items-center">
            <input
              ref={noteRef}
              name="note"
              autoComplete="off"
              placeholder="Detail (link, quantity, phone…)"
              className="flex-1 bg-transparent px-2 py-1.5 text-sm text-zinc-300 placeholder:text-zinc-600 outline-none"
            />
            <label className="flex items-center gap-1.5 px-2 text-xs text-zinc-500">
              <span>Due</span>
              <input
                name="due_date"
                type="date"
                className="bg-transparent text-sm text-zinc-300 outline-none [color-scheme:dark]"
              />
            </label>
          </div>
        )}
      </form>

      {total > 2 && (
        <div className="mt-3 flex gap-1.5">
          {SORTS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setSort(s.id)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                sort === s.id
                  ? "bg-cyan-500/15 text-cyan-300 ring-1 ring-cyan-500/30"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      )}

      {total === 0 ? (
        <div className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-8 text-center">
          <p className="text-sm text-zinc-400">No {itemLabel}s yet.</p>
        </div>
      ) : (
        <ul className="mt-4 space-y-2">
          {active.map((i, idx) => (
            <Row
              key={i.id}
              appId={appId}
              item={i}
              manual={sort === "manual"}
              isFirst={idx === 0}
              isLast={idx === active.length - 1}
              onMove={(d) => move(i.id, d)}
            />
          ))}
        </ul>
      )}

      {done.length > 0 && (
        <div className="mt-6">
          <button
            type="button"
            onClick={() => setShowDone((v) => !v)}
            className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-500 hover:text-zinc-300"
          >
            <span>{showDone ? "▼" : "▶"}</span>
            Completed ({done.length})
          </button>
          {showDone && (
            <ul className="mt-3 space-y-2">
              {done.map((i) => (
                <Row key={i.id} appId={appId} item={i} />
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function Row({
  appId,
  item,
  manual = false,
  isFirst = false,
  isLast = false,
  onMove,
}: {
  appId: string;
  item: Item;
  manual?: boolean;
  isFirst?: boolean;
  isLast?: boolean;
  onMove?: (direction: "up" | "down") => void;
}) {
  const [pending, start] = useTransition();
  const [editDue, setEditDue] = useState(false);
  function toggle() {
    start(() => checklistToggleAction(appId, item.id, !item.completed));
  }
  function remove() {
    if (!confirm("Delete?")) return;
    start(() => checklistDeleteAction(appId, item.id));
  }
  function setDue(value: string) {
    setEditDue(false);
    start(() => checklistSetDueAction(appId, item.id, value));
  }

  const isLink = item.note ? /^https?:\/\//i.test(item.note.trim()) : false;
  const due = dueMeta(item.due_date);

  return (
    <li className={`flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/40 px-3 py-3 ${pending ? "opacity-50" : ""}`}>
      {manual && onMove && (
        <div className="flex shrink-0 flex-col">
          <button
            type="button"
            onClick={() => onMove("up")}
            disabled={isFirst || pending}
            aria-label="Move up"
            className="px-1 text-zinc-500 hover:text-cyan-300 disabled:opacity-30"
          >
            ▲
          </button>
          <button
            type="button"
            onClick={() => onMove("down")}
            disabled={isLast || pending}
            aria-label="Move down"
            className="px-1 text-zinc-500 hover:text-cyan-300 disabled:opacity-30"
          >
            ▼
          </button>
        </div>
      )}
      <button
        type="button"
        onClick={toggle}
        aria-label={item.completed ? "Mark incomplete" : "Mark complete"}
        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition ${
          item.completed
            ? "border-cyan-500 bg-cyan-500 text-zinc-950"
            : "border-zinc-600 hover:border-cyan-400"
        }`}
      >
        {item.completed && <span className="text-xs leading-none">✓</span>}
      </button>
      <div className="min-w-0 flex-1">
        <div className={`break-words text-sm ${item.completed ? "text-zinc-500 line-through" : "text-zinc-100"}`}>
          {item.title}
        </div>
        {item.note &&
          (isLink ? (
            <a
              href={item.note}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="block truncate text-xs text-cyan-400 hover:text-cyan-300"
            >
              {item.note}
            </a>
          ) : (
            <div className="break-words text-xs text-zinc-500">{item.note}</div>
          ))}
      </div>
      {!item.completed &&
        (editDue ? (
          <input
            type="date"
            autoFocus
            defaultValue={item.due_date ?? ""}
            onChange={(e) => setDue(e.target.value)}
            onBlur={() => setEditDue(false)}
            className="shrink-0 bg-transparent text-xs text-zinc-300 outline-none [color-scheme:dark]"
          />
        ) : (
          <button
            type="button"
            onClick={() => setEditDue(true)}
            className={`shrink-0 rounded-md px-1.5 py-0.5 text-xs ${due ? due.tone : "text-zinc-600 hover:text-zinc-400"}`}
          >
            {due ? due.label : "＋ due"}
          </button>
        ))}
      {item.completed && due && <span className="shrink-0 text-xs text-zinc-600">{due.label}</span>}
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
