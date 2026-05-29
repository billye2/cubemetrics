"use client";

import { useRef, useState, useTransition } from "react";
import {
  captureItem,
  dismissItem,
  triageToBacklog,
  triageToNote,
  triageToTodo,
} from "./actions";

interface ViewItem {
  id: number;
  text: string;
  created_at: string;
  age: string;
}

export function InboxView({
  items,
  oldest,
}: {
  items: ViewItem[];
  oldest: string | null;
}) {
  return (
    <div className="space-y-6">
      <CaptureBox />
      <Hero count={items.length} oldest={oldest} />
      {items.length > 0 && (
        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
            To process
          </h3>
          <ul className="space-y-2">
            {items.map((it) => (
              <InboxRow key={it.id} item={it} />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function CaptureBox() {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [pending, start] = useTransition();

  function save() {
    const el = ref.current;
    if (!el) return;
    const text = el.value.trim();
    if (!text) return;
    start(async () => {
      await captureItem(text);
      el.value = "";
      el.focus();
    });
  }

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-3">
      <textarea
        ref={ref}
        autoFocus
        rows={2}
        placeholder="Capture a thought… (Enter to save, Shift+Enter for a new line)"
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            save();
          }
        }}
        className="w-full resize-none bg-transparent px-1 py-1 text-base text-zinc-100 placeholder:text-zinc-500 outline-none"
      />
      <div className="mt-2 flex justify-end">
        <button
          type="button"
          onClick={save}
          disabled={pending}
          className="min-h-[44px] rounded-lg bg-cyan-500 px-5 py-2 text-sm font-semibold text-zinc-950 hover:bg-cyan-400 disabled:opacity-50"
        >
          Capture
        </button>
      </div>
    </div>
  );
}

function Hero({ count, oldest }: { count: number; oldest: string | null }) {
  if (count === 0) {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 text-center">
        <div className="text-3xl text-cyan-400">✓</div>
        <p className="mt-2 text-base font-semibold text-zinc-100">Inbox zero</p>
        <p className="text-xs text-zinc-500">
          Nothing to process. Capture a thought above whenever it strikes.
        </p>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-3 gap-2">
      <div className="col-span-1 rounded-xl border border-zinc-800 bg-zinc-900/40 px-3 py-3 text-center">
        <div className="text-3xl font-bold tabular-nums text-cyan-400">{count}</div>
        <div className="mt-0.5 text-[10px] font-medium uppercase tracking-wider text-zinc-500">
          to process
        </div>
      </div>
      <Stat label="In inbox" value={String(count)} />
      <Stat label="Oldest" value={oldest ?? "—"} />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 px-3 py-3 text-center">
      <div className="truncate text-base font-semibold text-zinc-100" title={value}>
        {value}
      </div>
      <div className="mt-0.5 text-[10px] font-medium uppercase tracking-wider text-zinc-500">
        {label}
      </div>
    </div>
  );
}

function InboxRow({ item }: { item: ViewItem }) {
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<void>) => start(fn);

  return (
    <li
      className={`rounded-xl border border-zinc-800 bg-zinc-900/40 p-3 ${
        pending ? "opacity-50" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 flex-1 whitespace-pre-wrap break-words text-sm text-zinc-100">
          {item.text}
        </p>
        <button
          type="button"
          onClick={() => run(() => dismissItem(item.id))}
          disabled={pending}
          aria-label="Dismiss"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-800 hover:text-red-400"
        >
          <span className="text-lg leading-none">×</span>
        </button>
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        <span className="text-[11px] text-zinc-600">{item.age}</span>
        <div className="flex gap-1.5">
          <TriageButton label="→ Todo" onClick={() => run(() => triageToTodo(item.id))} disabled={pending} />
          <TriageButton label="→ Note" onClick={() => run(() => triageToNote(item.id))} disabled={pending} />
          <TriageButton label="→ Backlog" onClick={() => run(() => triageToBacklog(item.id))} disabled={pending} />
        </div>
      </div>
    </li>
  );
}

function TriageButton({
  label,
  onClick,
  disabled,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="min-h-[36px] rounded-lg border border-zinc-700 bg-zinc-900/60 px-2.5 text-xs font-medium text-zinc-300 hover:border-cyan-500/60 hover:text-cyan-300 disabled:opacity-50"
    >
      {label}
    </button>
  );
}
