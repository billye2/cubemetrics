"use client";

import { useRef, useState, useTransition } from "react";
import {
  submitFeedbackAction,
  approveFeedbackAction,
  rejectFeedbackAction,
  type ReviewResult,
} from "./actions";
import { getApp } from "@/lib/modern/catalog";

export interface Feedback {
  id: number;
  category: string;
  body: string;
  status: string;
  app_id: string | null;
  github_issue_url: string | null;
  created_at: string;
}

export interface PendingFeedback extends Feedback {
  handle: string | null;
}

const CATEGORIES = [
  { id: "bug", label: "Bug" },
  { id: "feature", label: "Feature" },
  { id: "improvement", label: "Improvement" },
  { id: "other", label: "Other" },
];

type Tab = "submit" | "mine" | "board" | "review";

export function FeedbackView({
  mine,
  board,
  isAdmin,
  pending,
}: {
  mine: Feedback[];
  board: Feedback[];
  isAdmin: boolean;
  pending: PendingFeedback[];
}) {
  const [tab, setTab] = useState<Tab>(isAdmin && pending.length > 0 ? "review" : "submit");

  return (
    <div>
      <Tabs
        tab={tab}
        setTab={setTab}
        mineCount={mine.length}
        boardCount={board.length}
        reviewCount={isAdmin ? pending.length : undefined}
      />
      {tab === "submit" && <SubmitForm />}
      {tab === "mine" && <FeedbackList items={mine} empty="You haven't submitted any feedback yet." />}
      {tab === "board" && <FeedbackList items={board} empty="No feedback on the board yet." />}
      {tab === "review" && isAdmin && <FeedbackReview items={pending} />}
    </div>
  );
}

function Tabs({
  tab,
  setTab,
  mineCount,
  boardCount,
  reviewCount,
}: {
  tab: Tab;
  setTab: (t: Tab) => void;
  mineCount: number;
  boardCount: number;
  reviewCount?: number;
}) {
  const items: { id: Tab; label: string; count?: number }[] = [
    { id: "submit", label: "Submit" },
    { id: "mine", label: "Mine", count: mineCount },
    { id: "board", label: "Board", count: boardCount },
  ];
  if (reviewCount !== undefined) items.push({ id: "review", label: "Review", count: reviewCount });

  return (
    <div className="mb-4 inline-flex rounded-xl border border-zinc-800 bg-zinc-900/60 p-1">
      {items.map((i) => (
        <button
          key={i.id}
          type="button"
          onClick={() => setTab(i.id)}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
            tab === i.id ? "bg-zinc-800 text-zinc-100" : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          {i.label}
          {i.count !== undefined && i.count > 0 && (
            <span className="ml-1.5 text-xs text-zinc-500">{i.count}</span>
          )}
        </button>
      ))}
    </div>
  );
}

function SubmitForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [category, setCategory] = useState("feature");
  const [pending, start] = useTransition();
  const [submitted, setSubmitted] = useState(false);

  function submit(formData: FormData) {
    formData.set("category", category);
    start(async () => {
      await submitFeedbackAction(formData);
      formRef.current?.reset();
      setCategory("feature");
      setSubmitted(true);
      setTimeout(() => setSubmitted(false), 3000);
    });
  }

  return (
    <form ref={formRef} action={submit} className="space-y-3">
      <div>
        <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">Type</div>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCategory(c.id)}
              className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
                category === c.id
                  ? "border-cyan-500 bg-cyan-500/10 text-cyan-300"
                  : "border-zinc-800 bg-zinc-900/40 text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>
      <textarea
        name="body"
        required
        placeholder="What would make this better?"
        rows={6}
        className="w-full resize-none rounded-xl border border-zinc-800 bg-zinc-900/60 px-3 py-3 text-base text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-cyan-500/50"
      />
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="h-11 flex-1 rounded-xl bg-cyan-500 text-sm font-semibold text-zinc-950 hover:bg-cyan-400 disabled:opacity-50"
        >
          {pending ? "Sending…" : "Send feedback"}
        </button>
        {submitted && <span className="text-sm font-medium text-emerald-400">✓ Sent</span>}
      </div>
    </form>
  );
}

function FeedbackList({ items, empty }: { items: Feedback[]; empty: string }) {
  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-8 text-center">
        <p className="text-sm text-zinc-400">{empty}</p>
      </div>
    );
  }
  return (
    <ul className="space-y-3">
      {items.map((f) => (
        <li key={f.id} className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
          <div className="mb-1 flex items-center justify-between text-xs text-zinc-500">
            <div className="flex items-center gap-2">
              <CategoryTag category={f.category} />
              <AppTag appId={f.app_id} />
            </div>
            <span>{new Date(f.created_at).toLocaleDateString()}</span>
          </div>
          <p className="whitespace-pre-wrap break-words text-sm text-zinc-200">{f.body}</p>
          <StatusLine status={f.status} url={f.github_issue_url} />
        </li>
      ))}
    </ul>
  );
}

function FeedbackReview({ items }: { items: PendingFeedback[] }) {
  const [pending, start] = useTransition();
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resolved, setResolved] = useState<Record<number, "approved" | "rejected">>({});

  function act(id: number, kind: "approve" | "reject") {
    setError(null);
    setBusyId(id);
    const fd = new FormData();
    fd.set("id", String(id));
    const run = kind === "approve" ? approveFeedbackAction : rejectFeedbackAction;
    start(async () => {
      const res: ReviewResult = await run(fd);
      setBusyId(null);
      if (!res.ok) {
        setError(res.error ?? "Something went wrong");
        return;
      }
      setResolved((r) => ({ ...r, [id]: kind === "approve" ? "approved" : "rejected" }));
    });
  }

  const visible = items.filter((i) => !resolved[i.id]);

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-8 text-center">
        <p className="text-sm text-zinc-400">No feedback waiting for review.</p>
      </div>
    );
  }

  return (
    <div>
      {error && (
        <div className="mb-3 rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </div>
      )}
      <ul className="space-y-3">
        {visible.map((f) => (
          <li key={f.id} className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="mb-1 flex items-center justify-between text-xs text-zinc-500">
              <div className="flex items-center gap-2">
                <CategoryTag category={f.category} />
                <AppTag appId={f.app_id} />
                {f.handle && <span className="text-zinc-400">{f.handle}</span>}
              </div>
              <span>{new Date(f.created_at).toLocaleDateString()}</span>
            </div>
            <p className="whitespace-pre-wrap break-words text-sm text-zinc-200">{f.body}</p>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => act(f.id, "approve")}
                disabled={pending && busyId === f.id}
                className="h-9 flex-1 rounded-lg bg-cyan-500 text-sm font-semibold text-zinc-950 hover:bg-cyan-400 disabled:opacity-50"
              >
                {pending && busyId === f.id ? "Working…" : "Approve → open issue"}
              </button>
              <button
                type="button"
                onClick={() => act(f.id, "reject")}
                disabled={pending && busyId === f.id}
                className="h-9 rounded-lg border border-zinc-800 px-4 text-sm font-medium text-zinc-300 hover:border-zinc-700 hover:text-zinc-100 disabled:opacity-50"
              >
                Reject
              </button>
            </div>
          </li>
        ))}
      </ul>
      {visible.length === 0 && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-8 text-center">
          <p className="text-sm text-zinc-400">All caught up — nothing left to review.</p>
        </div>
      )}
    </div>
  );
}

function StatusLine({ status, url }: { status: string; url: string | null }) {
  if (status === "approved") {
    return (
      <div className="mt-2 text-xs font-medium text-emerald-400">
        ✓ Approved
        {url && (
          <>
            {" · "}
            <a href={url} target="_blank" rel="noreferrer" className="text-cyan-400 hover:underline">
              View issue ↗
            </a>
          </>
        )}
      </div>
    );
  }
  if (status === "rejected") {
    return <div className="mt-2 text-xs font-medium text-zinc-500">Not planned</div>;
  }
  return <div className="mt-2 text-xs font-medium text-amber-400">Pending review</div>;
}

function AppTag({ appId }: { appId: string | null }) {
  if (!appId) return null;
  const name = getApp(appId)?.name ?? appId;
  return (
    <span className="rounded-md bg-zinc-700/40 px-1.5 py-0.5 text-[10px] font-medium text-zinc-300">
      {name}
    </span>
  );
}

function CategoryTag({ category }: { category: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    bug: { label: "BUG", cls: "bg-red-500/15 text-red-300" },
    feature: { label: "FEAT", cls: "bg-cyan-500/15 text-cyan-300" },
    improvement: { label: "IMPR", cls: "bg-amber-500/15 text-amber-300" },
    other: { label: "OTHER", cls: "bg-zinc-700/40 text-zinc-300" },
  };
  const m = map[category] ?? { label: category.toUpperCase().slice(0, 6), cls: "bg-zinc-700/40 text-zinc-300" };
  return <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ${m.cls}`}>{m.label}</span>;
}
