"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import type { Client } from "./page";
import {
  addClient,
  deleteClient,
  getClientEvents,
  linkNextActionToCountdown,
  setStatus,
  updateClient,
  type ClientEvent,
} from "./actions";

const STATUS_META: Record<
  string,
  { label: string; order: number; badge: string; bar: string }
> = {
  lead: { label: "Lead", order: 0, badge: "bg-sky-500/20 text-sky-300", bar: "bg-sky-500" },
  active: {
    label: "Active",
    order: 1,
    badge: "bg-amber-500/20 text-amber-300",
    bar: "bg-amber-500",
  },
  done: {
    label: "Done",
    order: 2,
    badge: "bg-emerald-500/20 text-emerald-300",
    bar: "bg-emerald-500",
  },
  lost: { label: "Lost", order: 3, badge: "bg-rose-500/15 text-rose-300", bar: "bg-rose-500/60" },
};

const STATUS_OPTIONS = ["lead", "active", "done", "lost"];

function todayStr(): string {
  return new Date().toISOString().split("T")[0];
}

function fmtMoney(n: number): string {
  return n.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: n % 1 === 0 ? 0 : 2,
  });
}

// Returns -1 overdue, 0 due today, 1 future, null none.
function dueState(date: string | null): -1 | 0 | 1 | null {
  if (!date) return null;
  const today = todayStr();
  if (date < today) return -1;
  if (date === today) return 0;
  return 1;
}

export function ClientView({ clients }: { clients: Client[] }) {
  // Sort by soonest next-action date (clients without one fall to the end),
  // tie-break on name.
  const sorted = useMemo(() => {
    return [...clients].sort((a, b) => {
      const da = a.next_action_date ?? "9999-99-99";
      const db = b.next_action_date ?? "9999-99-99";
      if (da !== db) return da < db ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  }, [clients]);

  const today = todayStr();

  const totalValue = clients.reduce((s, c) => s + c.value, 0);
  const activeCount = clients.filter((c) => c.status === "active").length;
  const overdueCount = clients.filter(
    (c) =>
      c.status !== "done" &&
      c.status !== "lost" &&
      c.next_action_date != null &&
      c.next_action_date <= today,
  ).length;

  // Won-vs-lost conversion: of clients that reached a terminal state, what
  // share were won (done) vs lost? Only closed clients count toward the rate.
  const wonCount = clients.filter((c) => c.status === "done").length;
  const lostCount = clients.filter((c) => c.status === "lost").length;
  const closedCount = wonCount + lostCount;
  const conversion =
    closedCount === 0 ? null : Math.round((wonCount / closedCount) * 100);

  const groups = STATUS_OPTIONS.map((status) => {
    const items = sorted.filter((c) => c.status === status);
    const value = items.reduce((s, c) => s + c.value, 0);
    return { status, items, value };
  });

  return (
    <div className="space-y-6">
      <Hero overdue={overdueCount} />

      <div className="grid grid-cols-3 gap-2">
        <Stat label="Pipeline" value={fmtMoney(totalValue)} />
        <Stat label="Active" value={String(activeCount)} />
        <Stat label="Overdue" value={String(overdueCount)} highlight={overdueCount > 0} />
      </div>

      {closedCount > 0 && (
        <div className="grid grid-cols-3 gap-2">
          <Stat
            label="Won rate"
            value={conversion === null ? "—" : `${conversion}%`}
            highlight={false}
          />
          <Stat label="Won" value={String(wonCount)} />
          <Stat label="Lost" value={String(lostCount)} />
        </div>
      )}

      <AddForm />

      {clients.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-3">
          {groups.map((g) =>
            g.items.length === 0 ? null : (
              <StatusSection
                key={g.status}
                status={g.status}
                items={g.items}
                value={g.value}
              />
            ),
          )}
        </div>
      )}
    </div>
  );
}

function Hero({ overdue }: { overdue: number }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 text-center">
      <div
        className={`text-4xl font-bold tabular-nums ${
          overdue > 0 ? "text-rose-300" : "text-zinc-100"
        }`}
      >
        {overdue}
      </div>
      <div className="mt-1 text-xs font-medium uppercase tracking-wider text-zinc-500">
        {overdue === 0
          ? "No follow-ups due"
          : `Follow-up${overdue === 1 ? "" : "s"} due or overdue`}
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 px-3 py-3 text-center">
      <div
        className={`text-base font-semibold ${highlight ? "text-rose-300" : "text-zinc-100"}`}
      >
        {value}
      </div>
      <div className="mt-0.5 text-[10px] font-medium uppercase tracking-wider text-zinc-500">
        {label}
      </div>
    </div>
  );
}

function StatusSection({
  status,
  items,
  value,
}: {
  status: string;
  items: Client[];
  value: number;
}) {
  const meta = STATUS_META[status] ?? STATUS_META.lead;
  const [open, setOpen] = useState(status === "lead" || status === "active");

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/40">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex min-h-[44px] w-full items-center gap-3 px-4 py-3 text-left"
      >
        <span className={`h-5 w-1 shrink-0 rounded-full ${meta.bar}`} aria-hidden />
        <span className="text-sm font-semibold text-zinc-100">{meta.label}</span>
        <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] font-semibold text-zinc-300">
          {items.length}
        </span>
        {value > 0 && (
          <span className="text-xs text-zinc-500 tabular-nums">{fmtMoney(value)}</span>
        )}
        <span className="ml-auto text-zinc-500">{open ? "▾" : "▸"}</span>
      </button>
      {open && (
        <ul className="space-y-2 px-3 pb-3">
          {items.map((c) => (
            <ClientRow key={c.id} client={c} />
          ))}
        </ul>
      )}
    </div>
  );
}

function ClientRow({ client }: { client: Client }) {
  const [pending, start] = useTransition();
  const [editing, setEditing] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [events, setEvents] = useState<ClientEvent[] | null>(null);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [linkMsg, setLinkMsg] = useState<string | null>(null);
  const meta = STATUS_META[client.status] ?? STATUS_META.lead;

  const due = dueState(client.next_action_date);
  const dueActive = client.status !== "done" && client.status !== "lost" && due != null;

  function remove() {
    if (!confirm(`Delete ${client.name}?`)) return;
    start(() => deleteClient(client.id));
  }

  function toggleHistory() {
    const next = !historyOpen;
    setHistoryOpen(next);
    if (next && events === null && !loadingEvents) {
      setLoadingEvents(true);
      getClientEvents(client.id)
        .then((e) => setEvents(e))
        .finally(() => setLoadingEvents(false));
    }
  }

  function linkCountdown() {
    setLinkMsg(null);
    start(async () => {
      const res = await linkNextActionToCountdown(client.id);
      setLinkMsg(res.ok ? "Added to Countdown" : res.error);
    });
  }

  if (editing) {
    return (
      <li className={`rounded-xl border border-zinc-800 bg-zinc-900/60 p-3 ${pending ? "opacity-50" : ""}`}>
        <EditForm
          client={client}
          pending={pending}
          onClose={() => setEditing(false)}
          onSave={(fields) =>
            start(async () => {
              await updateClient(client.id, fields);
              setEditing(false);
            })
          }
        />
      </li>
    );
  }

  const canLink = client.next_action_date != null && client.status !== "done" && client.status !== "lost";

  return (
    <li
      className={`rounded-xl border border-zinc-800 bg-zinc-900/40 ${
        pending ? "opacity-50" : ""
      }`}
    >
    <div className="flex items-start gap-3 py-3 pl-3 pr-2">
      <span className={`mt-0.5 h-9 w-1 shrink-0 rounded-full ${meta.bar}`} aria-hidden />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="break-words text-sm font-medium text-zinc-100">{client.name}</span>
          {client.value > 0 && (
            <span className="text-xs font-medium text-zinc-400 tabular-nums">
              {fmtMoney(client.value)}
            </span>
          )}
        </div>
        {(client.email || client.phone) && (
          <div className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-zinc-500">
            {client.email && <span className="break-all">{client.email}</span>}
            {client.phone && <span>{client.phone}</span>}
          </div>
        )}
        {client.next_action && (
          <div className="mt-1 flex flex-wrap items-center gap-x-2 text-xs">
            <span className="text-zinc-300">→ {client.next_action}</span>
            {client.next_action_date && (
              <span
                className={
                  dueActive && due !== null && due <= 0
                    ? "font-semibold text-rose-300"
                    : "text-zinc-500"
                }
              >
                {dueActive && due === -1
                  ? `overdue ${client.next_action_date}`
                  : dueActive && due === 0
                    ? `due today`
                    : client.next_action_date}
              </span>
            )}
          </div>
        )}
        {client.note && (
          <div className="mt-1 break-words text-xs text-zinc-500">{client.note}</div>
        )}
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <select
          aria-label="Status"
          value={client.status}
          onChange={(e) => start(() => setStatus(client.id, e.target.value))}
          disabled={pending}
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-1.5 py-1.5 text-xs text-zinc-300 outline-none focus:border-cyan-500"
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {STATUS_META[s].label}
            </option>
          ))}
        </select>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => setEditing(true)}
            disabled={pending}
            aria-label="Edit client"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-800 hover:text-cyan-400"
          >
            <span className="text-sm leading-none">✎</span>
          </button>
          <button
            type="button"
            onClick={remove}
            disabled={pending}
            aria-label="Delete client"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-800 hover:text-red-400"
          >
            <span className="text-lg leading-none">×</span>
          </button>
        </div>
      </div>
    </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-zinc-800/70 px-3 py-2 text-xs">
        <button
          type="button"
          onClick={toggleHistory}
          className="text-zinc-500 hover:text-zinc-300"
        >
          {historyOpen ? "Hide history" : "History"}
        </button>
        {canLink && (
          <button
            type="button"
            onClick={linkCountdown}
            disabled={pending}
            className="text-zinc-500 hover:text-cyan-400 disabled:opacity-50"
          >
            ⏳ Add to Countdown
          </button>
        )}
        {linkMsg && <span className="text-cyan-400">{linkMsg}</span>}
      </div>

      {historyOpen && (
        <div className="border-t border-zinc-800/70 px-3 py-2">
          {loadingEvents ? (
            <p className="text-xs text-zinc-500">Loading…</p>
          ) : events && events.length > 0 ? (
            <ol className="space-y-1">
              {events.map((e) => (
                <li key={e.id} className="flex items-baseline gap-2 text-xs">
                  <span className="shrink-0 text-zinc-600 tabular-nums">
                    {e.created_at.slice(0, 10)}
                  </span>
                  <span className="text-zinc-400">{describeEvent(e)}</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-xs text-zinc-500">No activity yet.</p>
          )}
        </div>
      )}
    </li>
  );
}

function statusLabel(status: string): string {
  return STATUS_META[status]?.label ?? status;
}

function describeEvent(e: ClientEvent): string {
  if (e.kind === "created") {
    return `Created as ${statusLabel(e.to_status || "lead")}`;
  }
  if (e.from_status) {
    return `${statusLabel(e.from_status)} → ${statusLabel(e.to_status)}`;
  }
  return `Set to ${statusLabel(e.to_status)}`;
}

const inputCls =
  "w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-base text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-cyan-500/60";

function EditForm({
  client,
  pending,
  onSave,
  onClose,
}: {
  client: Client;
  pending: boolean;
  onSave: (fields: {
    name: string;
    email: string;
    phone: string;
    value: string;
    next_action: string;
    next_action_date: string;
    note: string;
  }) => void;
  onClose: () => void;
}) {
  const formRef = useRef<HTMLFormElement>(null);

  function submit(formData: FormData) {
    const name = String(formData.get("name") || "").trim();
    if (!name) return;
    onSave({
      name,
      email: String(formData.get("email") || ""),
      phone: String(formData.get("phone") || ""),
      value: String(formData.get("value") || ""),
      next_action: String(formData.get("next_action") || ""),
      next_action_date: String(formData.get("next_action_date") || ""),
      note: String(formData.get("note") || ""),
    });
  }

  return (
    <form ref={formRef} action={submit} className="space-y-2">
      <input name="name" defaultValue={client.name} placeholder="Name" className={inputCls} />
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          name="email"
          type="email"
          defaultValue={client.email}
          placeholder="Email"
          className={inputCls}
        />
        <input name="phone" defaultValue={client.phone} placeholder="Phone" className={inputCls} />
      </div>
      <input
        name="value"
        type="number"
        min="0"
        step="0.01"
        inputMode="decimal"
        defaultValue={client.value || ""}
        placeholder="Project value"
        className={inputCls}
      />
      <input
        name="next_action"
        defaultValue={client.next_action}
        placeholder="Next action"
        className={inputCls}
      />
      <input
        name="next_action_date"
        type="date"
        defaultValue={client.next_action_date ?? ""}
        aria-label="Next action date"
        className={inputCls}
      />
      <textarea
        name="note"
        defaultValue={client.note}
        placeholder="Notes"
        rows={2}
        className={inputCls}
      />
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="min-h-[44px] flex-1 rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-cyan-400 disabled:opacity-50"
        >
          Save
        </button>
        <button
          type="button"
          onClick={onClose}
          disabled={pending}
          className="min-h-[44px] rounded-lg border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-800"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function AddForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, start] = useTransition();

  function submit(formData: FormData) {
    const name = String(formData.get("name") || "").trim();
    const status = String(formData.get("status") || "lead");
    if (!name) return;
    start(async () => {
      await addClient(name, status);
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
          placeholder="Client name"
          className={`min-w-0 flex-1 ${inputCls}`}
        />
        <select
          name="status"
          defaultValue="lead"
          aria-label="Status"
          className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-base text-zinc-100 outline-none focus:border-cyan-500/60"
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {STATUS_META[s].label}
            </option>
          ))}
        </select>
      </div>
      <button
        type="submit"
        disabled={pending}
        className="min-h-[44px] w-full rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-cyan-400 disabled:opacity-50"
      >
        Add client
      </button>
    </form>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-8 text-center">
      <div className="text-3xl text-zinc-600">◉</div>
      <p className="mt-2 text-sm text-zinc-300">No clients yet.</p>
      <p className="text-xs text-zinc-500">
        Add a client above, then tap the pencil to fill in contact info, value, and a follow-up.
      </p>
    </div>
  );
}
