"use client";

import { usePathname } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { submitFeedbackAction } from "@/app/app/feedback/actions";
import { getApp } from "@/lib/modern/catalog";

const CATEGORIES = [
  { id: "bug", label: "Bug" },
  { id: "feature", label: "Feature" },
  { id: "improvement", label: "Improvement" },
  { id: "other", label: "Other" },
];

/**
 * Header button shown on every app page that lets the user send feedback
 * pre-tagged with the current app. Rendered globally via <Shell>; it hides
 * itself when not on an /app/<id> route or on the feedback app itself.
 */
export function HeaderFeedback() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState("feature");
  const [done, setDone] = useState(false);
  const [pending, start] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  const appId = pathname?.startsWith("/app/") ? pathname.split("/")[2] || "" : "";
  // The feedback app has its own form; everywhere off /app/* has no app context.
  if (!appId || appId === "feedback") return null;

  const appName = getApp(appId)?.name ?? appId;

  function submit(formData: FormData) {
    formData.set("category", category);
    formData.set("app_id", appId);
    start(async () => {
      await submitFeedbackAction(formData);
      formRef.current?.reset();
      setDone(true);
      setTimeout(() => {
        setDone(false);
        setOpen(false);
        setCategory("feature");
      }, 1200);
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title={`Send feedback about ${appName}`}
        className="flex h-9 items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900/60 px-2.5 text-xs font-medium text-zinc-300 hover:border-zinc-700 hover:text-zinc-100 active:bg-zinc-800"
      >
        <span aria-hidden>✦</span>
        <span className="hidden sm:inline">Feedback</span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center"
          onClick={() => !pending && setOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950 p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-zinc-100">Feedback</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="rounded-lg px-2 py-1 text-zinc-500 hover:text-zinc-300"
              >
                ✕
              </button>
            </div>
            <p className="mb-4 mt-0.5 text-xs text-zinc-500">
              About <span className="text-zinc-300">{appName}</span>
            </p>

            <form ref={formRef} action={submit} className="space-y-3">
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
              <textarea
                name="body"
                required
                rows={4}
                placeholder={`What would make ${appName} better?`}
                className="w-full resize-none rounded-xl border border-zinc-800 bg-zinc-900/60 px-3 py-3 text-base text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-cyan-500/50"
              />
              <button
                type="submit"
                disabled={pending}
                className="h-11 w-full rounded-xl bg-cyan-500 text-sm font-semibold text-zinc-950 hover:bg-cyan-400 disabled:opacity-50"
              >
                {done ? "✓ Sent" : pending ? "Sending…" : "Send feedback"}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
