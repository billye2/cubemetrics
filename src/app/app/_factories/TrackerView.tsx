"use client";

import { useRef, useState, useTransition } from "react";
import { trackerAddAction, trackerDeleteAction } from "./actions";
import type { FactoryConfig } from "@/lib/modern/catalog";

interface Entry {
  id: number;
  value: number;
  note: string | null;
  created_at: string;
}

export function TrackerView({
  appId,
  config,
  entries,
}: {
  appId: string;
  config: FactoryConfig;
  entries: Entry[];
}) {
  const trackerType = config.trackerType!;
  const [selected, setSelected] = useState<number | null>(null);
  const noteRef = useRef<HTMLInputElement>(null);
  const valueRef = useRef<HTMLInputElement>(null);
  const [pending, start] = useTransition();
  const today = new Date().toISOString().slice(0, 10);
  const todays = entries.filter((e) => e.created_at.startsWith(today));
  const lastValue = entries[0]?.value;

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
      {/* Big "today" display */}
      <div className="mb-5 flex flex-col items-center rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
        <div className="text-xs uppercase tracking-wider text-zinc-500">Today</div>
        <div className="mt-1 text-4xl font-bold tracking-tight text-cyan-400">
          {todays.length > 0
            ? displayValue(todays[0].value, config)
            : lastValue !== undefined
            ? <span className="text-zinc-600">{displayValue(lastValue, config)}</span>
            : <span className="text-zinc-700">—</span>}
        </div>
        {config.unit && todays.length > 0 && (
          <div className="text-sm text-zinc-500">{config.unit}</div>
        )}
        {todays.length === 0 && lastValue !== undefined && (
          <div className="mt-1 text-xs text-zinc-500">last logged value</div>
        )}
      </div>

      {/* Logging form */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-3">
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

      {/* History */}
      <h3 className="mb-2 mt-6 text-xs font-semibold uppercase tracking-wider text-zinc-500">History</h3>
      {entries.length === 0 ? (
        <p className="text-sm text-zinc-500">No values logged yet.</p>
      ) : (
        <ul className="space-y-2">
          {entries.map((e) => (
            <EntryRow key={e.id} appId={appId} entry={e} config={config} />
          ))}
        </ul>
      )}
    </div>
  );
}

function displayValue(v: number, config: FactoryConfig) {
  if (config.labels) return config.labels[Math.round(v)] ?? String(v);
  return String(v);
}

function EntryRow({ appId, entry, config }: { appId: string; entry: Entry; config: FactoryConfig }) {
  const [pending, start] = useTransition();
  const date = new Date(entry.created_at);
  const dateLabel = date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  const timeLabel = date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });

  function remove() {
    if (!confirm("Delete this entry?")) return;
    start(() => trackerDeleteAction(appId, entry.id));
  }

  return (
    <li className={`flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/40 px-3 py-2 ${pending ? "opacity-50" : ""}`}>
      <div className="w-16 text-xs text-zinc-500">
        <div>{dateLabel}</div>
        <div className="text-zinc-600">{timeLabel}</div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-zinc-100">
          {displayValue(entry.value, config)}
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
