"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import type { FactoryConfig } from "@/lib/modern/catalog";
import { BucketSection } from "./FactoryUI";
import {
  scheduleAddAction,
  scheduleDeleteAction,
  scheduleDoneAction,
  scheduleSetIntervalAction,
} from "./actions";

interface Item {
  id: number;
  title: string;
  interval_days: number;
  last_done: string | null;
  note: string | null;
  created_at: string;
}

type Status = "due" | "soon" | "ok";

const INTERVALS = [
  { v: 1, label: "Daily" },
  { v: 7, label: "Weekly" },
  { v: 14, label: "Biweekly" },
  { v: 30, label: "Monthly" },
  { v: 90, label: "Quarterly" },
  { v: 182, label: "Every 6 months" },
  { v: 365, label: "Yearly" },
];

const STATUS_BAR: Record<Status, string> = {
  due: "bg-rose-500",
  soon: "bg-amber-500",
  ok: "bg-emerald-500",
};
const STATUS_TEXT: Record<Status, string> = {
  due: "text-rose-300",
  soon: "text-amber-300",
  ok: "text-emerald-300",
};

function parseDate(d: string): Date {
  const [y, m, day] = d.split("-").map(Number);
  return new Date(y, m - 1, day);
}
function dayDiff(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / 86_400_000);
}
function fmtSpan(days: number): string {
  const d = Math.abs(days);
  if (d >= 60) return `${Math.round(d / 30)}mo`;
  if (d >= 14) return `${Math.round(d / 7)}w`;
  return `${d}d`;
}
function intervalLabel(days: number): string {
  return INTERVALS.find((i) => i.v === days)?.label ?? `every ${fmtSpan(days)}`;
}

interface Enriched extends Item {
  status: Status;
  dueIn: number;
  label: string;
}

export function ScheduleView({
  appId,
  config,
  items,
}: {
  appId: string;
  config: FactoryConfig;
  items: Item[];
}) {
  const scheduleType = config.scheduleType!;
  const noun = (config.itemLabel ?? "item").toLowerCase();

  const enriched: Enriched[] = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const out = items.map((it) => {
      let dueIn = 0;
      let label = "never done — due now";
      if (it.last_done) {
        const next = parseDate(it.last_done);
        next.setDate(next.getDate() + it.interval_days);
        dueIn = dayDiff(today, next);
        if (dueIn <= 0) label = dueIn === 0 ? "due today" : `${fmtSpan(dueIn)} overdue`;
        else label = `due in ${fmtSpan(dueIn)}`;
      }
      const status: Status = dueIn <= 0 ? "due" : dueIn <= 7 ? "soon" : "ok";
      return { ...it, dueIn, status, label };
    });
    out.sort((a, b) => a.dueIn - b.dueIn);
    return out;
  }, [items]);

  const dueCount = enriched.filter((e) => e.status === "due").length;

  // Group by due status into Countdown-style sections.
  const STATUS_SECTIONS: { key: Status; label: string }[] = [
    { key: "due", label: "Due now" },
    { key: "soon", label: "This week" },
    { key: "ok", label: "Scheduled" },
  ];
  const groups: Record<Status, Enriched[]> = { due: [], soon: [], ok: [] };
  for (const e of enriched) groups[e.status].push(e);

  return (
    <div className="space-y-6">
      <Hero dueCount={dueCount} noun={noun} hasItems={items.length > 0} />
      <AddForm appId={appId} scheduleType={scheduleType} noun={noun} />
      {items.length === 0 ? (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-8 text-center">
          <p className="text-sm text-zinc-300">No {noun}s yet.</p>
          <p className="text-xs text-zinc-500">Add one above and set how often it repeats.</p>
        </div>
      ) : (
        <div>
          {STATUS_SECTIONS.filter((s) => groups[s.key].length).map((s) => (
            <BucketSection key={s.key} label={s.label} count={groups[s.key].length} danger={s.key === "due"}>
              {groups[s.key].map((it) => (
                <Row key={it.id} appId={appId} item={it} />
              ))}
            </BucketSection>
          ))}
        </div>
      )}
    </div>
  );
}

function Hero({
  dueCount,
  noun,
  hasItems,
}: {
  dueCount: number;
  noun: string;
  hasItems: boolean;
}) {
  if (!hasItems) return null;
  if (dueCount === 0) {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 text-center">
        <div className="text-3xl text-emerald-400">✓</div>
        <p className="mt-2 text-sm font-semibold text-zinc-100">All caught up</p>
        <p className="text-xs text-zinc-500">Nothing due right now.</p>
      </div>
    );
  }
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 text-center">
      <div className="text-4xl font-bold tabular-nums text-rose-400">{dueCount}</div>
      <p className="mt-1 text-xs font-medium uppercase tracking-wider text-zinc-500">
        {dueCount === 1 ? `${noun} due` : `${noun}s due`}
      </p>
    </div>
  );
}

function AddForm({
  appId,
  scheduleType,
  noun,
}: {
  appId: string;
  scheduleType: string;
  noun: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [interval, setInterval] = useState(30);
  const [pending, start] = useTransition();

  function submit(formData: FormData) {
    const title = String(formData.get("title") || "").trim();
    const note = String(formData.get("note") || "");
    if (!title) return;
    start(async () => {
      await scheduleAddAction(appId, scheduleType, title, interval, note);
      formRef.current?.reset();
    });
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
        placeholder={`Add ${noun}… (e.g. Oil change)`}
        className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-base text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-cyan-500/60"
      />
      <input
        name="note"
        autoComplete="off"
        placeholder="Detail (optional)"
        className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-300 placeholder:text-zinc-600 outline-none focus:border-cyan-500/60"
      />
      <div className="flex items-center gap-2">
        <label className="text-xs text-zinc-500">Repeats</label>
        <select
          value={interval}
          onChange={(e) => setInterval(Number(e.target.value))}
          className="flex-1 rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-2 text-sm text-zinc-200 outline-none focus:border-cyan-500"
        >
          {INTERVALS.map((i) => (
            <option key={i.v} value={i.v}>
              {i.label}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={pending}
          className="min-h-[44px] rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-cyan-400 disabled:opacity-50"
        >
          Add
        </button>
      </div>
    </form>
  );
}

function Row({ appId, item }: { appId: string; item: Enriched }) {
  const [pending, start] = useTransition();

  const options = [...INTERVALS];
  if (!options.some((o) => o.v === item.interval_days)) {
    options.unshift({ v: item.interval_days, label: intervalLabel(item.interval_days) });
  }

  function remove() {
    if (!confirm(`Delete "${item.title}"?`)) return;
    start(() => scheduleDeleteAction(appId, item.id));
  }

  return (
    <li
      className={`flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/40 py-3 pl-3 pr-2 ${
        pending ? "opacity-50" : ""
      }`}
    >
      <span className={`h-9 w-1 shrink-0 rounded-full ${STATUS_BAR[item.status]}`} aria-hidden />
      <div className="min-w-0 flex-1">
        <div className="break-words text-sm font-medium text-zinc-100">{item.title}</div>
        <div className="mt-0.5 flex flex-wrap gap-x-2 text-xs">
          <span className={STATUS_TEXT[item.status]}>{item.label}</span>
          {item.note && <span className="text-zinc-600">· {item.note}</span>}
        </div>
      </div>
      <select
        aria-label={`Repeat interval for ${item.title}`}
        value={item.interval_days}
        onChange={(e) => start(() => scheduleSetIntervalAction(appId, item.id, Number(e.target.value)))}
        disabled={pending}
        className="shrink-0 rounded-lg border border-zinc-700 bg-zinc-900 px-1.5 py-1.5 text-xs text-zinc-300 outline-none focus:border-cyan-500"
      >
        {options.map((o) => (
          <option key={o.v} value={o.v}>
            {o.label}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={() => start(() => scheduleDoneAction(appId, item.id))}
        disabled={pending}
        aria-label={`Mark ${item.title} done today`}
        title="Mark done today"
        className="flex h-9 shrink-0 items-center justify-center rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-2.5 text-xs font-semibold text-cyan-300 hover:bg-cyan-500/20"
      >
        ✓ Done
      </button>
      <button
        type="button"
        onClick={remove}
        disabled={pending}
        aria-label="Delete"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-800 hover:text-red-400"
      >
        <span className="text-lg leading-none">×</span>
      </button>
    </li>
  );
}
