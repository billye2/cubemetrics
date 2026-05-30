"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import type { LightLevel, Plant, PlantStatus } from "./lib";
import { needsWaterToday, statsFor } from "./lib";
import { addPlant, deletePlant, updatePlant, waterPlant } from "./actions";

const FREQ_OPTIONS = [
  { v: 2, label: "Every 2 days" },
  { v: 3, label: "Every 3 days" },
  { v: 7, label: "Weekly" },
  { v: 10, label: "Every 10 days" },
  { v: 14, label: "Every 2 weeks" },
  { v: 21, label: "Every 3 weeks" },
  { v: 30, label: "Monthly" },
];

const LIGHT_OPTIONS: { v: LightLevel; label: string; icon: string }[] = [
  { v: "low", label: "Low", icon: "◗" },
  { v: "medium", label: "Medium", icon: "◐" },
  { v: "bright", label: "Bright", icon: "○" },
];

const STATUS_STYLE: Record<PlantStatus, { bar: string; text: string; badge: string }> = {
  overdue: { bar: "bg-rose-500", text: "text-rose-300", badge: "bg-rose-500/15 text-rose-300" },
  today: { bar: "bg-cyan-500", text: "text-cyan-300", badge: "bg-cyan-500/15 text-cyan-300" },
  upcoming: { bar: "bg-zinc-600", text: "text-zinc-400", badge: "bg-zinc-700/40 text-zinc-400" },
};

const LIGHT_LABEL: Record<LightLevel, string> = { low: "Low light", medium: "Medium light", bright: "Bright light" };

function freqLabel(days: number): string {
  const found = FREQ_OPTIONS.find((o) => o.v === days);
  if (found) return found.label;
  return `Every ${days} days`;
}

type Tab = "today" | "all";

export function PlantcareView({ plants }: { plants: Plant[] }) {
  const [tab, setTab] = useState<Tab>("today");
  const stats = useMemo(() => statsFor(plants), [plants]);
  const due = useMemo(() => needsWaterToday(plants), [plants]);

  const list = tab === "today" ? due : plants;

  return (
    <div className="space-y-6">
      <Hero dueCount={stats.dueToday} />

      <div className="grid grid-cols-3 gap-2">
        <Stat label="Plants" value={String(stats.total)} />
        <Stat
          label="Due today"
          value={String(stats.dueToday)}
          tone={stats.dueToday > 0 ? "text-cyan-400" : undefined}
        />
        <Stat
          label="Overdue"
          value={String(stats.overdue)}
          tone={stats.overdue > 0 ? "text-rose-400" : undefined}
        />
      </div>

      <AddPlantForm />

      <div className="flex gap-1 rounded-xl border border-zinc-800 bg-zinc-900/40 p-1">
        <TabButton active={tab === "today"} onClick={() => setTab("today")}>
          Needs water {due.length > 0 && `(${due.length})`}
        </TabButton>
        <TabButton active={tab === "all"} onClick={() => setTab("all")}>
          All plants {plants.length > 0 && `(${plants.length})`}
        </TabButton>
      </div>

      {list.length === 0 ? (
        <EmptyState tab={tab} hasPlants={plants.length > 0} />
      ) : (
        <ul className="space-y-2">
          {list.map((p) => (
            <PlantRow key={p.id} p={p} />
          ))}
        </ul>
      )}
    </div>
  );
}

function Hero({ dueCount }: { dueCount: number }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 text-center">
      {dueCount === 0 ? (
        <>
          <div className="text-3xl text-emerald-400">✓</div>
          <p className="mt-2 text-sm font-semibold text-zinc-100">Everything&apos;s watered</p>
          <p className="text-xs text-zinc-500">No plants need water today.</p>
        </>
      ) : (
        <>
          <div className="text-4xl font-bold tabular-nums text-cyan-400">{dueCount}</div>
          <p className="mt-1 text-xs font-medium uppercase tracking-wider text-zinc-500">
            {dueCount === 1 ? "plant needs water today" : "plants need water today"}
          </p>
        </>
      )}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 px-2 py-3 text-center">
      <div className={`text-base font-semibold tabular-nums ${tone ?? "text-zinc-100"}`}>{value}</div>
      <div className="mt-0.5 text-[10px] font-medium uppercase tracking-wider text-zinc-500">{label}</div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-[40px] flex-1 rounded-lg px-3 py-2 text-sm font-medium transition ${
        active ? "bg-cyan-500/20 text-cyan-300 ring-1 ring-cyan-500/40" : "text-zinc-400 hover:text-zinc-200"
      }`}
    >
      {children}
    </button>
  );
}

function todayISO(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

function AddPlantForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [freq, setFreq] = useState(7);
  const [light, setLight] = useState<LightLevel | "">("");
  const [pending, start] = useTransition();

  function submit(formData: FormData) {
    const name = String(formData.get("name") || "").trim();
    const note = String(formData.get("note") || "").trim();
    const lastWatered = String(formData.get("lastWatered") || "");
    if (!name) return;
    start(async () => {
      await addPlant({ name, frequencyDays: freq, light: light || undefined, note, lastWatered });
      formRef.current?.reset();
      setFreq(7);
      setLight("");
    });
  }

  return (
    <form
      ref={formRef}
      action={submit}
      className="space-y-2 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-3"
    >
      <input
        name="name"
        autoComplete="off"
        placeholder="Plant name (e.g. Monstera)"
        className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-base text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-cyan-500/60"
      />
      <div className="flex flex-col gap-2 sm:flex-row">
        <label className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2">
          <span className="text-xs text-zinc-500">Water</span>
          <select
            value={freq}
            onChange={(e) => setFreq(Number(e.target.value))}
            className="flex-1 bg-transparent text-sm text-zinc-200 outline-none"
          >
            {FREQ_OPTIONS.map((o) => (
              <option key={o.v} value={o.v} className="bg-zinc-900">
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2">
          <span className="whitespace-nowrap text-xs text-zinc-500">Last watered</span>
          <input
            name="lastWatered"
            type="date"
            defaultValue={todayISO()}
            max={todayISO()}
            className="min-w-0 flex-1 bg-transparent text-sm text-zinc-100 outline-none [color-scheme:dark]"
          />
        </label>
      </div>
      <div className="flex items-center gap-1">
        <span className="px-1 text-xs text-zinc-500">Light</span>
        {LIGHT_OPTIONS.map((o) => (
          <button
            key={o.v}
            type="button"
            onClick={() => setLight((cur) => (cur === o.v ? "" : o.v))}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
              light === o.v
                ? "bg-cyan-500/20 text-cyan-300 ring-1 ring-cyan-500/40"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <span className="mr-1">{o.icon}</span>
            {o.label}
          </button>
        ))}
      </div>
      <input
        name="note"
        autoComplete="off"
        placeholder="Care notes (optional)"
        className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-cyan-500/60"
      />
      <button
        type="submit"
        disabled={pending}
        className="min-h-[44px] w-full rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-cyan-400 disabled:opacity-50"
      >
        Add plant
      </button>
    </form>
  );
}

function PlantRow({ p }: { p: Plant }) {
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const style = STATUS_STYLE[p.status];

  const freqOptions = [...FREQ_OPTIONS];
  if (!freqOptions.some((o) => o.v === p.frequencyDays)) {
    freqOptions.unshift({ v: p.frequencyDays, label: `Every ${p.frequencyDays} days` });
  }

  function remove() {
    if (!confirm(`Delete ${p.name}?`)) return;
    start(() => deletePlant(p.id));
  }

  return (
    <li className={`rounded-xl border border-zinc-800 bg-zinc-900/40 ${pending ? "opacity-50" : ""}`}>
      <div className="flex items-center gap-3 py-3 pl-3 pr-2">
        <span className={`h-9 w-1 shrink-0 rounded-full ${style.bar}`} aria-hidden />
        <button type="button" onClick={() => setOpen((o) => !o)} className="min-w-0 flex-1 text-left">
          <div className="flex flex-wrap items-baseline gap-x-2">
            <span className="break-words text-sm font-medium text-zinc-100">{p.name}</span>
            {p.light && <span className="text-xs text-zinc-500">{LIGHT_LABEL[p.light]}</span>}
          </div>
          <div className="mt-0.5 flex items-center gap-2">
            <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${style.badge}`}>
              {p.status === "overdue" ? "Overdue" : p.status === "today" ? "Today" : "Upcoming"}
            </span>
            <span className={`text-xs ${style.text}`}>{p.label}</span>
          </div>
        </button>
        <button
          type="button"
          onClick={() => start(() => waterPlant(p.id))}
          disabled={pending}
          className="flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-lg bg-cyan-500/15 px-3 py-2 text-sm font-semibold text-cyan-300 ring-1 ring-cyan-500/30 transition hover:bg-cyan-500/25 disabled:opacity-50"
        >
          <span aria-hidden>💧</span>
          Water
        </button>
        <button
          type="button"
          onClick={remove}
          disabled={pending}
          aria-label={`Delete ${p.name}`}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-800 hover:text-red-400"
        >
          <span className="text-lg leading-none">×</span>
        </button>
      </div>

      {open && (
        <div className="space-y-2 border-t border-zinc-800 px-4 py-3 text-xs text-zinc-400">
          <div className="flex justify-between">
            <span>Last watered</span>
            <span className="tabular-nums text-zinc-300">{p.lastWatered ?? "never"}</span>
          </div>
          <div className="flex justify-between">
            <span>Next due</span>
            <span className="tabular-nums text-zinc-300">{p.nextDue ?? "now"}</span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span>Frequency</span>
            <select
              aria-label={`Watering frequency for ${p.name}`}
              value={p.frequencyDays}
              onChange={(e) => start(() => updatePlant(p.id, { frequencyDays: Number(e.target.value) }))}
              disabled={pending}
              className="rounded-lg border border-zinc-700 bg-zinc-900 px-1.5 py-1 text-xs text-zinc-300 outline-none focus:border-cyan-500"
            >
              {freqOptions.map((o) => (
                <option key={o.v} value={o.v}>
                  {freqLabel(o.v)}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span>Light</span>
            <select
              aria-label={`Light level for ${p.name}`}
              value={p.light ?? ""}
              onChange={(e) => start(() => updatePlant(p.id, { light: e.target.value }))}
              disabled={pending}
              className="rounded-lg border border-zinc-700 bg-zinc-900 px-1.5 py-1 text-xs text-zinc-300 outline-none focus:border-cyan-500"
            >
              <option value="">—</option>
              {LIGHT_OPTIONS.map((o) => (
                <option key={o.v} value={o.v}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          {p.note && (
            <div className="flex justify-between gap-4">
              <span>Note</span>
              <span className="break-words text-right text-zinc-300">{p.note}</span>
            </div>
          )}
        </div>
      )}
    </li>
  );
}

function EmptyState({ tab, hasPlants }: { tab: Tab; hasPlants: boolean }) {
  if (tab === "today") {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-8 text-center">
        <div className="text-3xl text-emerald-400">✓</div>
        <p className="mt-2 text-sm text-zinc-300">
          {hasPlants ? "Nothing needs water right now." : "No plants yet."}
        </p>
        <p className="text-xs text-zinc-500">
          {hasPlants ? "Switch to All plants to see the rest." : "Add your first plant above."}
        </p>
      </div>
    );
  }
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-8 text-center">
      <div className="text-3xl text-zinc-600">✿</div>
      <p className="mt-2 text-sm text-zinc-300">No plants tracked yet.</p>
      <p className="text-xs text-zinc-500">Add a plant with its watering schedule above.</p>
    </div>
  );
}
