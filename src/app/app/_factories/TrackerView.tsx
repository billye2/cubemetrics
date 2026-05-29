"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { trackerAddAction, trackerDeleteAction } from "./actions";
import type { FactoryConfig } from "@/lib/modern/catalog";
import {
  type TrackerEntry,
  type AggregateMode,
  bucketByDay,
  todayAggregate,
  averageOver,
  computeStreak,
  formatValue,
} from "./trackerLib";

export function TrackerView({
  appId,
  config,
  entries,
}: {
  appId: string;
  config: FactoryConfig;
  entries: TrackerEntry[];
}) {
  const trackerType = config.trackerType!;
  const mode: AggregateMode = config.aggregate ?? (config.labels ? "average" : "latest");
  const [selected, setSelected] = useState<number | null>(null);
  const noteRef = useRef<HTMLInputElement>(null);
  const valueRef = useRef<HTMLInputElement>(null);
  const [pending, start] = useTransition();

  const today = useMemo(() => todayAggregate(entries, mode), [entries, mode]);
  const buckets = useMemo(() => bucketByDay(entries, 7, mode), [entries, mode]);
  const sevenDayAvg = useMemo(() => averageOver(buckets), [buckets]);
  const streak = useMemo(() => computeStreak(entries), [entries]);
  const lastEntry = entries[0];

  function submit() {
    const val = selected ?? Number(valueRef.current?.value || 0);
    if (Number.isNaN(val)) return;
    const note = noteRef.current?.value || "";
    start(async () => {
      await trackerAddAction(appId, trackerType, val, note);
      if (noteRef.current) noteRef.current.value = "";
      if (valueRef.current) valueRef.current.value = "";
      setSelected(null);
    });
  }

  return (
    <div>
      <Hero today={today} lastEntry={lastEntry} mode={mode} config={config} />

      <StatsStrip
        today={today}
        sevenDayAvg={sevenDayAvg}
        streak={streak}
        mode={mode}
        config={config}
      />

      <SevenDayChart buckets={buckets} config={config} mode={mode} />

      <div className="mt-5 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-3">
        {config.labels ? (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {config.labels.map((label, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setSelected(i)}
                className={`rounded-xl border px-2 py-3 text-xs font-semibold transition ${
                  selected === i
                    ? "border-cyan-500 bg-cyan-500/15 text-cyan-200"
                    : "border-zinc-800 bg-zinc-900 text-zinc-300 hover:border-zinc-700"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <input
              ref={valueRef}
              type="number"
              inputMode="decimal"
              step="any"
              min={config.min ?? 0}
              max={config.max ?? 99999}
              placeholder={config.unit ? `Value (${config.unit})` : "Value"}
              className="flex-1 rounded-lg bg-zinc-900 px-3 py-2 text-base text-zinc-100 placeholder:text-zinc-500 outline-none ring-1 ring-zinc-800 focus:ring-cyan-500/50"
            />
          </div>
        )}
        <input
          ref={noteRef}
          placeholder="Note (optional)"
          className="mt-2 w-full rounded-lg bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none ring-1 ring-zinc-800 focus:ring-cyan-500/50"
        />
        <button
          type="button"
          onClick={submit}
          disabled={pending}
          className="mt-2 h-11 w-full rounded-xl bg-cyan-500 text-sm font-semibold text-zinc-950 hover:bg-cyan-400 disabled:opacity-50"
        >
          {pending ? "Saving…" : "Log value"}
        </button>
      </div>

      <h3 className="mb-2 mt-6 text-xs font-semibold uppercase tracking-wider text-zinc-500">
        History
      </h3>
      {entries.length === 0 ? (
        <p className="text-sm text-zinc-500">No values logged yet.</p>
      ) : (
        <ul className="space-y-2">
          {entries.slice(0, 30).map((e) => (
            <EntryRow key={e.id} appId={appId} entry={e} config={config} mode={mode} />
          ))}
        </ul>
      )}
    </div>
  );
}

function Hero({
  today,
  lastEntry,
  mode,
  config,
}: {
  today: number | null;
  lastEntry: TrackerEntry | undefined;
  mode: AggregateMode;
  config: FactoryConfig;
}) {
  return (
    <div className="mb-4 flex flex-col items-center rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
      <div className="text-xs uppercase tracking-wider text-zinc-500">Today</div>
      <div className="mt-1 text-4xl font-bold tracking-tight text-cyan-400">
        {today !== null ? (
          formatValue(today, config, mode)
        ) : lastEntry ? (
          <span className="text-zinc-600">{formatValue(Number(lastEntry.value) || 0, config, mode)}</span>
        ) : (
          <span className="text-zinc-700">—</span>
        )}
      </div>
      {config.unit && today !== null && (
        <div className="text-sm text-zinc-500">{config.unit}</div>
      )}
      {today === null && lastEntry && (
        <div className="mt-1 text-xs text-zinc-500">last logged value</div>
      )}
    </div>
  );
}

function StatsStrip({
  today,
  sevenDayAvg,
  streak,
  mode,
  config,
}: {
  today: number | null;
  sevenDayAvg: number | null;
  streak: number;
  mode: AggregateMode;
  config: FactoryConfig;
}) {
  const avgLabel = mode === "sum" ? "7d avg/day" : "7d avg";
  return (
    <div className="mb-4 grid grid-cols-3 gap-3">
      <Stat
        label="Today"
        value={today !== null ? formatValue(today, config, mode) : "—"}
        sub={today !== null ? config.unit : undefined}
      />
      <Stat
        label={avgLabel}
        value={sevenDayAvg !== null ? formatValue(sevenDayAvg, config, "average") : "—"}
        sub={sevenDayAvg !== null ? config.unit : undefined}
      />
      <Stat
        label="Streak"
        value={streak > 0 ? String(streak) : "—"}
        sub={streak > 0 ? (streak === 1 ? "day" : "days") : "start one"}
      />
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-3 text-center">
      <div className="text-xl font-bold tracking-tight text-cyan-400">{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-zinc-500">
        {sub ? `${label} · ${sub}` : label}
      </div>
    </div>
  );
}

function SevenDayChart({
  buckets,
  config,
  mode,
}: {
  buckets: ReturnType<typeof bucketByDay>;
  config: FactoryConfig;
  mode: AggregateMode;
}) {
  const max = Math.max(0.0001, ...buckets.map((b) => b.value));
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
      <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
        Last 7 days
      </div>
      <div className="flex h-24 items-end gap-1.5">
        {buckets.map((b) => {
          const has = b.count > 0;
          const h = !has ? 4 : Math.max(8, Math.round((b.value / max) * 100));
          const title = has
            ? `${b.label}: ${formatValue(b.value, config, mode)}${config.unit ? ` ${config.unit}` : ""}`
            : `${b.label}: no entries`;
          return (
            <div key={b.key} className="flex flex-1 flex-col items-center gap-1">
              <div
                title={title}
                className={`w-full rounded-md transition-all ${
                  !has
                    ? "bg-zinc-800"
                    : b.isToday
                    ? "bg-cyan-400"
                    : "bg-cyan-500/50"
                }`}
                style={{ height: `${h}%` }}
              />
              <div className={`text-[10px] ${b.isToday ? "text-cyan-300" : "text-zinc-500"}`}>
                {b.short}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function EntryRow({
  appId,
  entry,
  config,
  mode,
}: {
  appId: string;
  entry: TrackerEntry;
  config: FactoryConfig;
  mode: AggregateMode;
}) {
  const [pending, start] = useTransition();
  const date = new Date(entry.created_at);
  const dateLabel = date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  const timeLabel = date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });

  function remove() {
    if (!confirm("Delete this entry?")) return;
    start(() => trackerDeleteAction(appId, entry.id));
  }

  return (
    <li
      className={`flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/40 px-3 py-2 ${
        pending ? "opacity-50" : ""
      }`}
    >
      <div className="w-16 text-xs text-zinc-500">
        <div>{dateLabel}</div>
        <div className="text-zinc-600">{timeLabel}</div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-zinc-100">
          {formatValue(Number(entry.value) || 0, config, mode)}
          {config.unit && <span className="ml-1 text-xs font-normal text-zinc-500">{config.unit}</span>}
        </div>
        {entry.note && <div className="truncate text-xs text-zinc-400">{entry.note}</div>}
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
