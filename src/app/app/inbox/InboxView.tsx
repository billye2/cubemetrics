"use client";

import { useRef, useState, useTransition } from "react";
import {
  captureItem,
  dismissItem,
  triageToBacklog,
  triageToNote,
  triageToTodo,
} from "./actions";
import { StatTile, StatStrip, BucketSection } from "../_factories/FactoryUI";

interface ViewItem {
  id: number;
  text: string;
  created_at: string;
  age: string;
}

type AgeBucket = "Today" | "This week" | "Older";
const AGE_ORDER: AgeBucket[] = ["Today", "This week", "Older"];

function ageBucket(createdAt: string, now: Date = new Date()): AgeBucket {
  const c = new Date(createdAt);
  const cDay = new Date(c.getFullYear(), c.getMonth(), c.getDate());
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const days = Math.round((today.getTime() - cDay.getTime()) / 86_400_000);
  if (days <= 0) return "Today";
  if (days <= 7) return "This week";
  return "Older";
}

export function InboxView({
  items,
  oldest,
}: {
  items: ViewItem[];
  oldest: string | null;
}) {
  const groups: Record<AgeBucket, ViewItem[]> = { Today: [], "This week": [], Older: [] };
  for (const it of items) groups[ageBucket(it.created_at)].push(it);

  return (
    <div className="space-y-6">
      <CaptureBox />
      <Hero count={items.length} oldest={oldest} />
      {items.length > 0 && (
        <div>
          {AGE_ORDER.filter((b) => groups[b].length).map((b) => (
            <BucketSection key={b} label={b} count={groups[b].length}>
              {groups[b].map((it) => (
                <InboxRow key={it.id} item={it} />
              ))}
            </BucketSection>
          ))}
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
    <StatStrip cols={2}>
      <StatTile label="To process" value={String(count)} />
      <StatTile label="Oldest" value={oldest ?? "—"} tone="zinc" />
    </StatStrip>
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
