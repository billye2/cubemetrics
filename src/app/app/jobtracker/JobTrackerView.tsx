"use client";

import { useRef, useTransition } from "react";
import type { Application } from "./page";
import { StatStrip, StatTile, StatusPill, BucketSection } from "../_factories/FactoryUI";
import { addApplication, deleteApplication, setStage } from "./actions";

type Tone = "cyan" | "amber" | "emerald" | "rose" | "zinc";

const STAGE_META: Record<
  string,
  { label: string; order: number; tone: Tone; bar: string }
> = {
  saved: { label: "Saved", order: 0, tone: "zinc", bar: "bg-zinc-500" },
  applied: { label: "Applied", order: 1, tone: "cyan", bar: "bg-sky-500" },
  interview: { label: "Interview", order: 2, tone: "amber", bar: "bg-amber-500" },
  offer: { label: "Offer", order: 3, tone: "emerald", bar: "bg-emerald-500" },
  rejected: { label: "Rejected", order: 4, tone: "rose", bar: "bg-rose-500/60" },
};

const STAGE_OPTIONS = ["saved", "applied", "interview", "offer", "rejected"];

export function JobTrackerView({ applications }: { applications: Application[] }) {
  const counts: Record<string, number> = {};
  for (const a of applications) counts[a.stage] = (counts[a.stage] || 0) + 1;

  const rejected = counts["rejected"] || 0;
  const active = applications.length - rejected;
  const offers = counts["offer"] || 0;

  return (
    <div className="space-y-6">
      <StatStrip cols={3}>
        <StatTile label="Active" value={String(active)} tone="cyan" />
        <StatTile label="Offers" value={String(offers)} tone="emerald" />
        <StatTile label="Rejected" value={String(rejected)} tone="rose" />
      </StatStrip>

      <AddForm />

      {applications.length === 0 ? (
        <EmptyState />
      ) : (
        <div>
          {STAGE_OPTIONS.map((stage) => {
            const inStage = applications.filter((a) => a.stage === stage);
            if (inStage.length === 0) return null;
            return (
              <BucketSection
                key={stage}
                label={STAGE_META[stage].label}
                count={inStage.length}
              >
                {inStage.map((a) => (
                  <AppRow key={a.id} app={a} />
                ))}
              </BucketSection>
            );
          })}
        </div>
      )}
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
          <StatusPill label={meta.label} tone={meta.tone} />
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
