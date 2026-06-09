"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import {
  CADENCE_OPTIONS,
  allTags,
  applyFilters,
  draftCheckIn,
  logAgo,
  logsByContact,
  overdue,
  upcomingBirthdays,
  type Contact,
  type ContactLog,
  type Status,
} from "./lib";
import {
  addContact,
  addInteraction,
  deleteContact,
  deleteInteraction,
  updateContact,
} from "./actions";
import { Ring, StatTile, StatStrip } from "../_factories/FactoryUI";

const STATUS_STYLE: Record<Status, { bar: string; text: string }> = {
  due: { bar: "bg-rose-500", text: "text-rose-300" },
  soon: { bar: "bg-amber-500", text: "text-amber-300" },
  ok: { bar: "bg-emerald-500", text: "text-emerald-300" },
  none: { bar: "bg-zinc-600", text: "text-zinc-500" },
};

const input =
  "min-w-0 w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-base text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-cyan-500/60";

export function ContactsView({
  contacts,
  logs,
}: {
  contacts: Contact[];
  logs: ContactLog[];
}) {
  const [query, setQuery] = useState("");
  const [tag, setTag] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<number | null>(null);

  const tags = useMemo(() => allTags(contacts), [contacts]);
  const filtered = useMemo(() => applyFilters(contacts, { query, tag }), [contacts, query, tag]);
  const due = useMemo(() => overdue(contacts), [contacts]);
  const birthdays = useMemo(() => upcomingBirthdays(contacts, 30), [contacts]);
  const history = useMemo(() => logsByContact(logs, 3), [logs]);
  const tracked = useMemo(() => contacts.filter((c) => c.cadenceDays).length, [contacts]);

  return (
    <div className="space-y-5">
      <Hero due={due.length} tracked={tracked} />

      {birthdays.length > 0 && <BirthdayStrip items={birthdays} />}

      <StatStrip cols={3}>
        <StatTile label="People" value={String(contacts.length)} tone="zinc" />
        <StatTile label="Reach out" value={String(due.length)} tone={due.length > 0 ? "rose" : "zinc"} />
        <StatTile label="Tags" value={String(tags.length)} tone="zinc" />
      </StatStrip>

      {contacts.length > 0 && (
        <div className="space-y-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, company, email, phone, note…"
            className={input}
            aria-label="Search contacts"
          />
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              <Chip active={tag === null} onClick={() => setTag(null)}>
                All
              </Chip>
              {tags.map((t) => (
                <Chip key={t} active={tag === t} onClick={() => setTag(tag === t ? null : t)}>
                  #{t}
                </Chip>
              ))}
            </div>
          )}
        </div>
      )}

      {adding ? (
        <ContactForm
          onClose={() => setAdding(false)}
          presetTag={tag}
          submitLabel="Add contact"
        />
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="min-h-[44px] w-full rounded-xl border border-cyan-500/40 bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-300 hover:bg-cyan-500/20"
        >
          + New contact
        </button>
      )}

      {contacts.length === 0 ? (
        <EmptyState />
      ) : filtered.length === 0 ? (
        <p className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-6 text-center text-sm text-zinc-500">
          No contacts match.
        </p>
      ) : (
        <ul className="space-y-2">
          {filtered.map((c) =>
            editing === c.id ? (
              <li key={c.id}>
                <ContactForm
                  contact={c}
                  onClose={() => setEditing(null)}
                  submitLabel="Save"
                />
              </li>
            ) : (
              <ContactCard
                key={c.id}
                contact={c}
                logs={history.get(c.id) ?? []}
                onEdit={() => setEditing(c.id)}
              />
            ),
          )}
        </ul>
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
            <p className="mt-0.5 text-xs text-zinc-500">No one&apos;s overdue — nicely kept up.</p>
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

function BirthdayStrip({ items }: { items: { contact: Contact; inDays: number }[] }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-3">
      <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-zinc-500">
        🎂 Upcoming birthdays
      </p>
      <div className="flex flex-wrap gap-1.5">
        {items.map(({ contact, inDays }) => (
          <span
            key={contact.id}
            className="rounded-lg border border-zinc-800 bg-zinc-950/60 px-2 py-1 text-xs text-zinc-300"
          >
            {contact.name}{" "}
            <span className="text-zinc-500">
              {inDays === 0 ? "today!" : inDays === 1 ? "tomorrow" : `in ${inDays}d`}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}

function Chip({
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
      className={`rounded-full px-3 py-1 text-xs font-medium transition ${
        active
          ? "bg-cyan-500/20 text-cyan-300 ring-1 ring-cyan-500/40"
          : "border border-zinc-800 text-zinc-400 hover:text-zinc-200"
      }`}
    >
      {children}
    </button>
  );
}

function ContactForm({
  contact,
  onClose,
  submitLabel,
  presetTag,
}: {
  contact?: Contact;
  onClose: () => void;
  submitLabel: string;
  presetTag?: string | null;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, start] = useTransition();

  function submit(formData: FormData) {
    const name = String(formData.get("name") || "").trim();
    if (!name) return;
    start(async () => {
      if (contact) await updateContact(contact.id, formData);
      else await addContact(formData);
      onClose();
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
        defaultValue={contact?.name ?? ""}
        placeholder="Name"
        className={input}
        autoFocus
      />
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <input
          name="phone"
          type="tel"
          autoComplete="off"
          defaultValue={contact?.phone ?? ""}
          placeholder="Phone"
          className={input}
        />
        <input
          name="email"
          type="email"
          autoComplete="off"
          defaultValue={contact?.email ?? ""}
          placeholder="Email"
          className={input}
        />
      </div>
      <input
        name="company"
        autoComplete="off"
        defaultValue={contact?.company ?? ""}
        placeholder="Company / how you know them"
        className={input}
      />
      <input
        name="tags"
        autoComplete="off"
        defaultValue={(contact?.tags ?? (presetTag ? [presetTag] : [])).join(", ")}
        placeholder="Tags (family, work, friends)"
        className={input}
      />
      <textarea
        name="note"
        rows={2}
        defaultValue={contact?.note ?? ""}
        placeholder="Notes"
        className={`${input} resize-y`}
      />
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <label className="flex items-center gap-2 text-xs text-zinc-500">
          <span className="w-16 shrink-0">Reach out</span>
          <select
            name="cadence_days"
            defaultValue={contact?.cadenceDays ?? 0}
            className="min-w-0 flex-1 rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-2 text-sm text-zinc-200 outline-none focus:border-cyan-500"
          >
            {CADENCE_OPTIONS.map((o) => (
              <option key={o.v} value={o.v}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-xs text-zinc-500">
          <span className="w-16 shrink-0">Birthday</span>
          <input
            name="birthday"
            type="date"
            defaultValue={contact?.birthday ?? ""}
            className="min-w-0 flex-1 rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-2 text-sm text-zinc-200 outline-none focus:border-cyan-500"
          />
        </label>
      </div>
      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          disabled={pending}
          className="min-h-[44px] flex-1 rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-cyan-400 disabled:opacity-50"
        >
          {submitLabel}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="min-h-[44px] rounded-lg border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-800"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function ContactCard({
  contact,
  logs,
  onEdit,
}: {
  contact: Contact;
  logs: ContactLog[];
  onEdit: () => void;
}) {
  const [pending, start] = useTransition();
  const [logging, setLogging] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const style = STATUS_STYLE[contact.status];

  function remove() {
    if (!confirm(`Delete ${contact.name}?`)) return;
    start(() => deleteContact(contact.id));
  }

  return (
    <li
      className={`rounded-xl border border-zinc-800 bg-zinc-900/40 ${pending ? "opacity-50" : ""}`}
    >
      <div className="flex items-start gap-3 py-3 pl-3 pr-2">
        <span className={`mt-0.5 h-9 w-1 shrink-0 rounded-full ${style.bar}`} aria-hidden />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2">
            <span className="break-words text-sm font-medium text-zinc-100">{contact.name}</span>
            {contact.company && <span className="text-xs text-zinc-500">{contact.company}</span>}
          </div>

          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs">
            {contact.phone && (
              <a href={`tel:${contact.phone}`} className="text-cyan-400 hover:underline">
                ☎ {contact.phone}
              </a>
            )}
            {contact.email && (
              <a href={`mailto:${contact.email}`} className="text-cyan-400 hover:underline">
                ✉ {contact.email}
              </a>
            )}
          </div>

          {contact.note && (
            <p className="mt-1 break-words text-xs text-zinc-400">{contact.note}</p>
          )}

          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <span className={`text-xs ${style.text}`}>{contact.cadenceLabel}</span>
            {contact.tags.map((t) => (
              <span
                key={t}
                className="rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-400"
              >
                #{t}
              </span>
            ))}
            {(logs.length > 0 || showHistory) && (
              <button
                type="button"
                onClick={() => setShowHistory((v) => !v)}
                className="rounded-full px-1.5 py-0.5 text-[10px] text-zinc-500 hover:text-cyan-300"
                aria-expanded={showHistory}
              >
                {showHistory ? "hide history" : `history (${logs.length})`}
              </button>
            )}
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1">
          <button
            type="button"
            onClick={() => setLogging((v) => !v)}
            disabled={pending}
            title="Log a chat — record a note and mark contacted today"
            aria-label={`Log an interaction with ${contact.name}`}
            className="flex h-8 items-center justify-center rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-2.5 text-xs font-semibold text-cyan-300 hover:bg-cyan-500/20"
          >
            ✓ Log
          </button>
          <div className="flex gap-0.5">
            <button
              type="button"
              onClick={onEdit}
              disabled={pending}
              aria-label={`Edit ${contact.name}`}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
            >
              <span className="text-sm leading-none">✎</span>
            </button>
            <button
              type="button"
              onClick={remove}
              disabled={pending}
              aria-label={`Delete ${contact.name}`}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-800 hover:text-red-400"
            >
              <span className="text-lg leading-none">×</span>
            </button>
          </div>
        </div>
      </div>

      {logging && (
        <LogForm
          contact={contact}
          recent={logs[0] ?? null}
          onDone={() => setLogging(false)}
        />
      )}

      {showHistory && logs.length > 0 && (
        <ul className="space-y-1.5 border-t border-zinc-800/80 px-3 py-2.5">
          {logs.map((log) => (
            <li key={log.id} className="flex items-start gap-2 text-xs">
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-600" aria-hidden />
              <div className="min-w-0 flex-1">
                <span className="text-[10px] uppercase tracking-wider text-zinc-500">
                  {logAgo(log.loggedOn)}
                </span>
                {log.note && <p className="break-words text-zinc-300">{log.note}</p>}
              </div>
              <button
                type="button"
                onClick={() => deleteInteraction(log.id)}
                aria-label="Delete this log entry"
                className="shrink-0 text-zinc-600 hover:text-red-400"
              >
                <span className="text-sm leading-none">×</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

function LogForm({
  contact,
  recent,
  onDone,
}: {
  contact: Contact;
  recent: ContactLog | null;
  onDone: () => void;
}) {
  const [note, setNote] = useState("");
  const [pending, start] = useTransition();

  function submit(formData: FormData) {
    start(async () => {
      await addInteraction(contact.id, formData);
      setNote("");
      onDone();
    });
  }

  return (
    <form action={submit} className="space-y-2 border-t border-zinc-800/80 px-3 py-2.5">
      <textarea
        name="note"
        rows={2}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder={`What did you and ${contact.name.split(" ")[0]} talk about? (optional)`}
        className={`${input} resize-y text-sm`}
        autoFocus
      />
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="submit"
          disabled={pending}
          className="min-h-[36px] rounded-lg bg-cyan-500 px-3 py-1.5 text-xs font-semibold text-zinc-950 hover:bg-cyan-400 disabled:opacity-50"
        >
          Log & mark contacted
        </button>
        <button
          type="button"
          onClick={() => setNote(draftCheckIn(contact, recent))}
          className="min-h-[36px] rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-800"
          title="Draft a check-in message to copy"
        >
          ✎ Draft check-in
        </button>
        <button
          type="button"
          onClick={onDone}
          className="min-h-[36px] rounded-lg px-2 py-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-300"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-8 text-center">
      <div className="text-3xl text-zinc-600">☻</div>
      <p className="mt-2 text-sm text-zinc-300">No people yet.</p>
      <p className="text-xs text-zinc-500">
        Add the people who matter — phone, email, notes, and a cadence to stay in touch.
      </p>
    </div>
  );
}
