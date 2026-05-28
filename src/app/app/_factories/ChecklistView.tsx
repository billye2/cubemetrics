"use client";

import { useRef, useState, useTransition } from "react";
import { checklistAddAction, checklistToggleAction, checklistDeleteAction } from "./actions";
import type { FactoryConfig } from "@/lib/modern/catalog";

interface Item {
  id: number;
  title: string;
  completed: boolean;
  created_at: string;
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
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, start] = useTransition();
  const [showDone, setShowDone] = useState(false);
  const active = items.filter((i) => !i.completed);
  const done = items.filter((i) => i.completed);

  function submit(formData: FormData) {
    const title = String(formData.get("title") || "");
    if (!title.trim()) return;
    start(async () => {
      await checklistAddAction(appId, listType, title);
      formRef.current?.reset();
    });
  }

  return (
    <div>
      <form
        ref={formRef}
        action={submit}
        className="flex items-center gap-2 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-2"
      >
        <input
          name="title"
          autoComplete="off"
          placeholder={`Add ${(config.itemLabel ?? "item").toLowerCase()}…`}
          className="flex-1 bg-transparent px-2 py-2 text-base text-zinc-100 placeholder:text-zinc-500 outline-none"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-cyan-400 disabled:opacity-50"
        >
          Add
        </button>
      </form>

      {active.length === 0 && done.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-8 text-center">
          <p className="text-sm text-zinc-400">No {(config.itemLabel ?? "item").toLowerCase()}s yet.</p>
        </div>
      ) : (
        <ul className="mt-4 space-y-2">
          {active.map((i) => (
            <Row key={i.id} appId={appId} item={i} />
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

function Row({ appId, item }: { appId: string; item: Item }) {
  const [pending, start] = useTransition();
  function toggle() {
    start(() => checklistToggleAction(appId, item.id, !item.completed));
  }
  function remove() {
    if (!confirm("Delete?")) return;
    start(() => checklistDeleteAction(appId, item.id));
  }

  return (
    <li className={`flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/40 px-3 py-3 ${pending ? "opacity-50" : ""}`}>
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
      </div>
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
