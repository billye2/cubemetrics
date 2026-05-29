"use client";

import { useRef, useTransition } from "react";
import type { Application } from "./page";
import { addApplication, deleteApplication, setStage } from "./actions";

const STAGE_META: Record<
  string,
  { label: string; order: number; badge: string; bar: string }
> = {
  saved: { label: "Saved", order: 0, badge: "bg-zinc-700 text-zinc-200", bar: "bg-zinc-500" },
  applied: { label: "Applied", order: 1, badge: "bg-sky-500/20 text-sky-300", bar: "bg-sky-500" },
  interview: { label: "Interview", order: 2, badge: "bg-amber-500/20 text-amber-300", bar: "bg-amber-500" },
  offer: { label: "Offer", order: 3, badge: "bg-emerald-500/20 text-emerald-300", bar: "bg-emerald-500" },
  rejected: { label: "Rejected", order: 4, badge: "bg-rose-500/15 text-rose-300", bar: "bg-rose-500/60" },
};

const FUNNEL = ["saved", "applied", "interview", "offer"];
const STAGE_OPTIONS = ["saved", "applied", "interview", "offer", "rejected"];

export function JobTrackerView({ applications }: { applications: Application[] }) {
  const counts: Record<string, number> = {};
  for (const a of applications) counts[a.stage] = (counts[a.stage] || 0) + 1;

  const rejected = counts["rejected"] || 0;
  const active = applications.length - rejected;
  const offers = counts["offer"] || 0;

  const sorted = [...applications].sort(
    (a, b) => (STAGE_META[a.stage]?.order ?? 0) - (STAGE_META[b.stage]?.order ?? 0),
  );

  return (
    <div className="space-y-6">
      <Funnel counts={counts} />
      <div className="grid grid-cols-3 gap-2">
        <Stat label="Active" value={String(active)} />
        <Stat label="Offers" value={String(offers)} />
        <Stat label="Rejected" value={String(rejected)} />
      </div>

      <AddForm />

      {applications.length === 0 ? (
        <EmptyState />
      ) : (
        <ul className="space-y-2">
          {sorted.map((a) => (
            <AppRow key={a.id} app={a} />
          ))}
        </ul>
      )}
    </div>
  );
}

function Funnel({ counts }: { counts: Record<string, number> }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
      <div className="grid grid-cols-4 gap-1.5">
        {FUNNEL.map((s) => {
          const meta = STAGE_META[s];
          return (
            <div key={s} className="text-center">
              <div className="text-2xl font-bold tabular-nums text-zinc-100">
                {counts[s] || 0}
              </div>
              <div className="mt-1 flex justify-center">
                <span className={`inline-block h-1 w-8 rounded-full ${meta.bar}`} />
              </div>
              <div className="mt-1 text-[10px] font-medium uppercase tracking-wider text-zinc-500">
                {meta.label}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 px-3 py-3 text-center">
      <div className="text-base font-semibold text-zinc-100">{value}</div>
      <div className="mt-0.5 text-[10px] font-medium uppercase tracking-wider text-zinc-500">
        {label}
      </div>
    </div>
  );
}

function AddForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, start] = useTransition();

  function submit(formData: FormData) {
    const company = String(formData.get("company") || "").trim();
    const role = String(formData.get("role") || "").trim();
    if (!company) return;
    start(async () => {
      await addApplication(company, role);
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
          name="company"
          autoComplete="off"
          placeholder="Company"
          className="min-w-0 flex-1 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-base text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-cyan-500/60"
        />
        <input
          name="role"
          autoComplete="off"
          placeholder="Role (optional)"
          className="min-w-0 flex-1 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-base text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-cyan-500/60"
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="min-h-[44px] w-full rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-cyan-400 disabled:opacity-50"
      >
        Add application
      </button>
    </form>
  );
}

function AppRow({ app }: { app: Application }) {
  const [pending, start] = useTransition();
  const meta = STAGE_META[app.stage] ?? STAGE_META.saved;

  function remove() {
    if (!confirm(`Delete ${app.company}?`)) return;
    start(() => deleteApplication(app.id));
  }

  return (
    <li
      className={`flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/40 py-3 pl-3 pr-2 ${
        pending ? "opacity-50" : ""
      }`}
    >
      <span className={`h-9 w-1 shrink-0 rounded-full ${meta.bar}`} aria-hidden />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="break-words text-sm font-medium text-zinc-100">{app.company}</span>
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${meta.badge}`}>
            {meta.label}
          </span>
        </div>
        <div className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-zinc-400">
          {app.role && <span className="break-words">{app.role}</span>}
          {app.applied_on && <span className="text-zinc-500">Applied {app.applied_on}</span>}
        </div>
      </div>
      <select
        aria-label="Stage"
        value={app.stage}
        onChange={(e) => start(() => setStage(app.id, e.target.value))}
        disabled={pending}
        className="shrink-0 rounded-lg border border-zinc-700 bg-zinc-900 px-1.5 py-1.5 text-xs text-zinc-300 outline-none focus:border-cyan-500"
      >
        {STAGE_OPTIONS.map((s) => (
          <option key={s} value={s}>
            {STAGE_META[s].label}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={remove}
        disabled={pending}
        aria-label="Delete application"
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
      <div className="text-3xl text-zinc-600">❏</div>
      <p className="mt-2 text-sm text-zinc-300">No applications yet.</p>
      <p className="text-xs text-zinc-500">
        Add a company above — saved roles, ones you've applied to, interviews, offers.
      </p>
    </div>
  );
}
