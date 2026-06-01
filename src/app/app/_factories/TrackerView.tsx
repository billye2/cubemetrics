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

  // One-tap logging for additive trackers (water +1, meditation +5m).
  function quickAdd(n: number) {
    start(() => trackerAddAction(appId, trackerType, n, ""));
  }

  const showQuickAdd = mode === "sum" && !!config.quickAdd && config.quickAdd.length > 0;

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
        {showQuickAdd && (
          <div className="mb-2 flex flex-wrap gap-2">
            {config.quickAdd!.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => quickAdd(n)}
                disabled={pending}
                className="min-w-[72px] flex-1 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-3 text-sm font-semibold text-cyan-200 transition hover:border-cyan-500/50 disabled:opacity-50"
              >
                +{formatValue(n, config, "sum")}
              </button>
            ))}
          </div>
        )}
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

function GoalRing({
  pct,
  met,
  over,
  children,
}: {
  pct: number;
  met: boolean;
  over: boolean;
  children: React.ReactNode;
}) {
  const size = 128;
  const stroke = 9;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const dash = circ * Math.max(0, Math.min(1, pct));
  // Theme accent for on-track (azure in dark / teal in light, via the Tailwind
  // accent var); semantic green/red for met/over.
  const color = over ? "#f87171" : met ? "#34d399" : "var(--color-cyan-500)";
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-zinc-800)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circ}`}
          className="transition-all duration-500 motion-reduce:transition-none"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
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
  const display =
    today !== null
      ? formatValue(today, config, mode)
      : lastEntry
      ? formatValue(Number(lastEntry.value) || 0, config, mode)
      : null;

  const goal = config.dailyGoal;
  if (goal && goal > 0) {
    const value = today ?? 0;
    const atMost = config.goalDirection === "at-most";
    const pct = value / goal;
    const met = atMost ? value <= goal : value >= goal;
    const over = atMost && value > goal;
    const unit = config.unit ? ` ${config.unit}` : "";
    let caption: string;
    if (atMost) {
      caption = over
        ? `${formatValue(value - goal, config, "sum")}${unit} over your ${formatValue(goal, config, mode)} cap`
        : `${formatValue(goal - value, config, "sum")}${unit} left under your cap`;
    } else {
      caption = met
        ? "Goal reached 🎉"
        : `${formatValue(goal - value, config, "sum")}${unit} to your goal`;
    }
    return (
      <div className="mb-4 flex flex-col items-center rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
        <div className="mb-3 text-xs uppercase tracking-wider text-zinc-500">Today</div>
        <GoalRing pct={pct} met={met} over={over}>
          <div className="text-3xl font-bold tracking-tight text-cyan-400">
            {display ?? <span className="text-zinc-700">—</span>}
          </div>
          {config.unit && <div className="text-[11px] text-zinc-500">{config.unit}</div>}
        </GoalRing>
        <div className={`mt-3 text-xs ${over ? "text-red-400" : met ? "text-emerald-400" : "text-zinc-500"}`}>
          {today === null && lastEntry ? "last logged value" : caption}
        </div>
      </div>
    );
  }

  return (
    <div className="mb-4 flex flex-col items-center rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
      <div className="text-xs uppercase tracking-wider text-zinc-500">Today</div>
      <div className="mt-1 text-4xl font-bold tracking-tight text-cyan-400">
        {today !== null ? (
          display
        ) : lastEntry ? (
          <span className="text-zinc-600">{display}</span>
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

function DayLabels({ buckets }: { buckets: ReturnType<typeof bucketByDay> }) {
  return (
    <div className="mt-1 flex gap-1.5">
      {buckets.map((b) => (
        <div
          key={b.key}
          className={`flex-1 text-center text-[10px] ${b.isToday ? "text-cyan-300" : "text-zinc-500"}`}
        >
          {b.short}
        </div>
      ))}
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
  // Weight-style trackers want an auto-fit line, not 0-based bars.
  if (config.chartStyle === "line") {
    return <LineChart buckets={buckets} config={config} mode={mode} />;
  }

  const goal = config.dailyGoal;
  const range = config.idealRange;
  // Scale the axis to include the goal / band so they're always on-chart.
  const max = Math.max(0.0001, goal ?? 0, range?.[1] ?? 0, ...buckets.map((b) => b.value));
  // When a band is present it replaces the single goal line (avoids clutter).
  const goalPct = goal && goal > 0 && !range ? Math.min(100, (goal / max) * 100) : null;
  const atMost = config.goalDirection === "at-most";
  const bandBottom = range ? (range[0] / max) * 100 : 0;
  const bandHeight = range ? ((Math.min(range[1], max) - range[0]) / max) * 100 : 0;

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
          Last 7 days
        </div>
        {range ? (
          <div className="text-[10px] text-emerald-400/80">
            ideal {formatValue(range[0], config, mode)}–{formatValue(range[1], config, mode)}
            {config.unit ? ` ${config.unit}` : ""}
          </div>
        ) : (
          goal && goal > 0 && (
            <div className="text-[10px] text-amber-400/80">
              {atMost ? "cap" : "goal"} {formatValue(goal, config, mode)}
              {config.unit ? ` ${config.unit}` : ""}
            </div>
          )
        )}
      </div>
      <div className="relative flex h-24 items-end gap-1.5">
        {range && (
          <div
            className="pointer-events-none absolute inset-x-0 z-0 border-y border-dashed border-emerald-500/30 bg-emerald-500/10"
            style={{ bottom: `${bandBottom}%`, height: `${bandHeight}%` }}
            title={`Ideal: ${formatValue(range[0], config, mode)}–${formatValue(range[1], config, mode)}${config.unit ? ` ${config.unit}` : ""}`}
          />
        )}
        {goalPct !== null && (
          <div
            className="pointer-events-none absolute inset-x-0 z-10 border-t border-dashed border-amber-400/60"
            style={{ bottom: `${goalPct}%` }}
            title={`${atMost ? "Cap" : "Goal"}: ${formatValue(goal!, config, mode)}`}
          />
        )}
        {buckets.map((b) => {
          const has = b.count > 0;
          const h = !has ? 4 : Math.max(8, Math.round((b.value / max) * 100));
          // Tint a day emerald when it hits an at-least goal or lands in the ideal band.
          const inRange = !!range && has && b.value >= range[0] && b.value <= range[1];
          const hitGoal = !atMost && !!goal && goal > 0 && has && b.value >= goal;
          const title = has
            ? `${b.label}: ${formatValue(b.value, config, mode)}${config.unit ? ` ${config.unit}` : ""}`
            : `${b.label}: no entries`;
          return (
            <div
              key={b.key}
              title={title}
              className={`relative z-[5] w-full flex-1 rounded-md transition-all motion-reduce:transition-none ${
                !has
                  ? "bg-zinc-800"
                  : inRange || hitGoal
                  ? "bg-emerald-500/70"
                  : b.isToday
                  ? "bg-cyan-400"
                  : "bg-cyan-500/50"
              }`}
              style={{ height: `${h}%` }}
            />
          );
        })}
      </div>
      <DayLabels buckets={buckets} />
    </div>
  );
}

function LineChart({
  buckets,
  config,
  mode,
}: {
  buckets: ReturnType<typeof bucketByDay>;
  config: FactoryConfig;
  mode: AggregateMode;
}) {
  const n = buckets.length;
  const present = buckets
    .map((b, i) => ({ i, b }))
    .filter((p) => p.b.count > 0);

  const header = (extra?: React.ReactNode) => (
    <div className="mb-2 flex items-center justify-between">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
        Last 7 days
      </div>
      {extra}
    </div>
  );

  if (present.length === 0) {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
        {header()}
        <div className="flex h-24 items-center justify-center text-xs text-zinc-600">
          No entries yet
        </div>
        <DayLabels buckets={buckets} />
      </div>
    );
  }

  const values = present.map((p) => p.b.value);
  const rawLo = Math.min(...values);
  const rawHi = Math.max(...values);
  // Scale trackers (mood/energy/…) use a fixed ordinal axis so the line reads
  // against the whole Awful→Great range; numeric trackers (weight) auto-fit to
  // the data (with padding) so values near 150–160 fill the chart.
  const isScale = !!config.labels;
  let lo: number;
  let hi: number;
  if (isScale) {
    lo = 0;
    hi = config.labels!.length - 1;
  } else if (rawLo === rawHi) {
    lo = rawLo - 1;
    hi = rawHi + 1;
  } else {
    const pad = (rawHi - rawLo) * 0.15;
    lo = rawLo - pad;
    hi = rawHi + pad;
  }
  const span = hi - lo || 1;
  const xOf = (i: number) => 4 + (i / (n - 1)) * 92;
  const yOf = (v: number) => 8 + (1 - (v - lo) / span) * 84;
  const polyline = present.map((p) => `${xOf(p.i).toFixed(2)},${yOf(p.b.value).toFixed(2)}`).join(" ");
  const latestIdx = present[present.length - 1].i;

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
      {header(
        <div className="text-[10px] text-zinc-500">
          {rawLo === rawHi
            ? formatValue(rawLo, config, mode)
            : `${formatValue(rawLo, config, mode)}–${formatValue(rawHi, config, mode)}`}
          {config.unit ? ` ${config.unit}` : ""}
        </div>,
      )}
      <div className="relative h-24">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
          <polyline
            points={polyline}
            fill="none"
            stroke="var(--color-cyan-500)"
            strokeWidth={1.5}
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        {present.map((p) => (
          <div
            key={p.i}
            title={`${p.b.label}: ${formatValue(p.b.value, config, mode)}${config.unit ? ` ${config.unit}` : ""}`}
            className={`absolute h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-zinc-950 ${
              p.i === latestIdx ? "bg-emerald-400" : "bg-cyan-400"
            }`}
            style={{ left: `${xOf(p.i)}%`, top: `${yOf(p.b.value)}%` }}
          />
        ))}
      </div>
      <DayLabels buckets={buckets} />
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
