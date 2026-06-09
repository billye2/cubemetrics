"use client";

import { useRef, useState, useTransition } from "react";
import type { Contact, Status } from "./page";
import { addContact, deleteContact, logTouch, setCadence } from "./actions";
import { Ring, StatTile, StatStrip, StatusPill, BucketSection } from "../_factories/FactoryUI";

const STATUS_TONE: Record<Status, "rose" | "amber" | "emerald" | "zinc"> = {
  due: "rose",
  soon: "amber",
  ok: "emerald",
  none: "zinc",
};

const STATUS_SECTIONS: { key: Status; label: string; danger: boolean }[] = [
  { key: "due", label: "Reach out now", danger: true },
  { key: "soon", label: "Coming up", danger: false },
  { key: "ok", label: "On track", danger: false },
  { key: "none", label: "No cadence", danger: false },
];

const CADENCE_OPTIONS = [
  { v: 0, label: "No cadence" },
  { v: 7, label: "Weekly" },
  { v: 14, label: "Biweekly" },
  { v: 30, label: "Monthly" },
  { v: 90, label: "Quarterly" },
  { v: 180, label: "Twice a year" },
  { v: 365, label: "Yearly" },
];

const STATUS_STYLE: Record<Status, { bar: string; text: string }> = {
  due: { bar: "bg-rose-500", text: "text-rose-300" },
  soon: { bar: "bg-amber-500", text: "text-amber-300" },
  ok: { bar: "bg-emerald-500", text: "text-emerald-300" },
  none: { bar: "bg-zinc-600", text: "text-zinc-500" },
};

export function KeepInTouchView({ contacts }: { contacts: Contact[] }) {
  const due = contacts.filter((c) => c.status === "due").length;
  const soon = contacts.filter((c) => c.status === "soon").length;
  const tracked = contacts.filter((c) => c.cadenceDays).length;

  const groups: Record<Status, Contact[]> = { due: [], soon: [], ok: [], none: [] };
  for (const c of contacts) groups[c.status].push(c);

  return (
    <div className="space-y-6">
      <Hero due={due} tracked={tracked} />
      <StatStrip cols={3}>
        <StatTile label="People" value={String(contacts.length)} tone="zinc" />
        <StatTile label="Due now" value={String(due)} tone={due > 0 ? "rose" : "zinc"} />
        <StatTile label="Upcoming" value={String(soon)} tone={soon > 0 ? "amber" : "zinc"} />
      </StatStrip>

      <AddContactForm />

      {contacts.length === 0 ? (
        <EmptyState />
      ) : (
        STATUS_SECTIONS.filter((s) => groups[s.key].length).map((s) => (
          <BucketSection key={s.key} label={s.label} count={groups[s.key].length} danger={s.danger}>
            {groups[s.key].map((c) => (
              <ContactRow key={c.id} contact={c} />
            ))}
          </BucketSection>
        ))
      )}
      {tracked === 0 && contacts.length > 0 && (
        <p className="text-center text-xs text-zinc-600">
          Set a cadence on someone to start getting nudges.
        </p>
      )}
    </div>
  );
}

function Hero({ due, tracked }: { due: number; tracked: number }) {
  const caughtPct = tracked > 0 ? (tracked - due) / tracked : 1;
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
      <Ring pct={caughtPct} size={72} stroke={8} tone={due === 0 ? "emerald" : "rose"}>
        {due === 0 ? (
          <span className="text-2xl text-emerald-400">✓</span>
        ) : (
          <span className="text-2xl font-bold tabular-nums text-rose-400">{due}</span>
        )}
      </Ring>
      <div className="min-w-0">
        {due === 0 ? (
          <>
            <p className="text-[15px] font-bold text-emerald-400">All caught up</p>
            <p className="mt-0.5 text-xs text-zinc-500">No one&rsquo;s overdue — nicely kept up.</p>
          </>
        ) : (
          <>
            <p className="text-[15px] font-bold text-zinc-100">
              {due} {due === 1 ? "person" : "people"} to reach out to
            </p>
            <p className="mt-0.5 text-xs text-zinc-500">{tracked} on a cadence</p>
          </>
        )}
      </div>
    </div>
  );
}

function AddContactForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [cadence, setCadenceState] = useState(30);
  const [pending, start] = useTransition();

  function submit(formData: FormData) {
    const name = String(formData.get("name") || "").trim();
    const company = String(formData.get("company") || "").trim();
    if (!name) return;
    start(async () => {
      await addContact(name, cadence, company);
      formRef.current?.reset();
    });
  }

  return (
    <form
      ref={formRef}
      action={submit}
      className="space-y-2 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-3"
    >
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          name="name"
          autoComplete="off"
          placeholder="Name"
          className="min-w-0 flex-1 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-base text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-cyan-500/60"
        />
        <input
          name="company"
          autoComplete="off"
          placeholder="Company / context (optional)"
          className="min-w-0 flex-1 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-base text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-cyan-500/60"
        />
      </div>
      <div className="flex items-center gap-2">
        <label className="text-xs text-zinc-500">Reach out</label>
        <select
          value={cadence}
          onChange={(e) => setCadenceState(Number(e.target.value))}
          className="flex-1 rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-2 text-sm text-zinc-200 outline-none focus:border-cyan-500"
        >
          {CADENCE_OPTIONS.filter((o) => o.v > 0).map((o) => (
            <option key={o.v} value={o.v}>
              {o.label}
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

function ContactRow({ contact }: { contact: Contact }) {
  const [pending, start] = useTransition();
  const style = STATUS_STYLE[contact.status];

  // The select must always have a matching option, even for a custom cadence.
  const options = [...CADENCE_OPTIONS];
  const current = contact.cadenceDays ?? 0;
  if (current > 0 && !options.some((o) => o.v === current)) {
    options.unshift({ v: current, label: `${current}d` });
  }

  function remove() {
    if (!confirm(`Delete ${contact.name}?`)) return;
    start(() => deleteContact(contact.id));
  }

  return (
    <li
      className={`flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/40 py-3 pl-3 pr-2 ${
        pending ? "opacity-50" : ""
      }`}
    >
      <span className={`h-9 w-1 shrink-0 rounded-full ${style.bar}`} aria-hidden />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <span className="break-words text-sm font-medium text-zinc-100">{contact.name}</span>
          {contact.company && (
            <span className="text-xs text-zinc-500">{contact.company}</span>
          )}
        </div>
        <div className="mt-1">
          <StatusPill label={contact.label} tone={STATUS_TONE[contact.status]} />
        </div>
      </div>

      <select
        aria-label={`Cadence for ${contact.name}`}
        value={current}
        onChange={(e) => start(() => setCadence(contact.id, Number(e.target.value)))}
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
        onClick={() => start(() => logTouch(contact.id))}
        disabled={pending}
        aria-label={`Log that you reached out to ${contact.name}`}
        title="Reached out today"
        className="flex h-9 shrink-0 items-center justify-center rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-2.5 text-xs font-semibold text-cyan-300 hover:bg-cyan-500/20"
      >
        ✓ Touch
      </button>
      <button
        type="button"
        onClick={remove}
        disabled={pending}
        aria-label="Delete contact"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-800 hover:text-red-400"
      >
        <span className="text-lg leading-none">×</span>
      </button>
    </li>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-8 text-center">
      <div className="text-3xl text-zinc-600">❥</div>
      <p className="mt-2 text-sm text-zinc-300">No one here yet.</p>
      <p className="text-xs text-zinc-500">
        Add someone you want to stay in touch with and pick how often.
      </p>
    </div>
  );
}
