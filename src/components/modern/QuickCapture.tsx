"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { capture, captureTo, undoCapture } from "@/lib/spine/capture";
import type { CaptureResponse, LoggableApp, QuickLogResult } from "@/lib/spine/types";

const PLACEHOLDERS = ["water 2", "todo call mom", "journal had a good day", "run  (a habit)"];

/**
 * Global quick-capture bar (Spine Layer 2). Mounted in <Shell>, so it's on every
 * logged-in page. Type free text → it routes to the right app's quickLog; if it's
 * unsure, a one-tap picker disambiguates. Confirmation offers Undo + Send-elsewhere.
 */
export function QuickCapture({ variant = "header" }: { variant?: "header" | "cta" }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [result, setResult] = useState<QuickLogResult | null>(null);
  const [candidates, setCandidates] = useState<LoggableApp[]>([]);
  const [picker, setPicker] = useState(false);
  const [pending, start] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Open on ⌘/Ctrl-K anywhere, or bare "/" when not typing in a field.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(true);
        return;
      }
      const el = document.activeElement;
      const typing = el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || (el as HTMLElement)?.isContentEditable;
      if (e.key === "/" && !typing && !open) {
        e.preventDefault();
        setOpen(true);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 30);
  }, [open]);

  function reset() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setText("");
    setResult(null);
    setCandidates([]);
    setPicker(false);
  }

  function close() {
    setOpen(false);
    reset();
  }

  function apply(r: CaptureResponse, submitted: string) {
    setText(submitted);
    setCandidates(r.candidates);
    if (r.result?.ok) {
      setResult(r.result);
      setPicker(false);
      router.refresh();
      closeTimer.current = setTimeout(close, 2200);
    } else if (r.result && !r.result.ok) {
      setResult(r.result); // inline error message + picker fallback
      setPicker(true);
    } else {
      setResult(null); // ambiguous — show the picker
      setPicker(true);
    }
  }

  function submit() {
    const t = text.trim();
    if (!t || pending) return;
    start(async () => apply(await capture(t), t));
  }

  function pick(appId: string) {
    const t = text.trim();
    if (!t || pending) return;
    start(async () => apply(await captureTo(appId, t), t));
  }

  function doUndo() {
    if (!result?.undo || pending) return;
    const undo = result.undo;
    start(async () => {
      await undoCapture(undo);
      router.refresh();
      close();
    });
  }

  const placeholder = PLACEHOLDERS[text.length % PLACEHOLDERS.length];

  return (
    <>
      {variant === "cta" ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-zinc-700 bg-zinc-900/40 text-sm font-medium text-zinc-300 transition hover:border-cyan-500/40 hover:text-zinc-100 active:scale-[0.99]"
        >
          <span aria-hidden>＋</span> Capture something
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          title="Quick capture (⌘K)"
          aria-label="Quick capture"
          className="flex h-9 items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900/60 px-2.5 text-xs font-medium text-zinc-300 hover:border-zinc-700 hover:text-zinc-100 active:bg-zinc-800"
        >
          <span aria-hidden>＋</span>
          <span className="hidden sm:inline">Capture</span>
        </button>
      )}

      {open &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center"
            onClick={() => !pending && close()}
          >
            <div
              className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950 p-5 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-zinc-100">Quick capture</h2>
                <button
                  type="button"
                  onClick={close}
                  aria-label="Close"
                  className="rounded-lg px-2 py-1 text-zinc-500 hover:text-zinc-300"
                >
                  ✕
                </button>
              </div>

              {result?.ok ? (
                // success
                <div className="mt-4 space-y-3">
                  <p className="text-sm text-emerald-400">✓ {result.message}</p>
                  <div className="flex gap-2">
                    {result.undo && (
                      <button
                        type="button"
                        onClick={doUndo}
                        disabled={pending}
                        className="h-9 rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 text-sm text-zinc-300 hover:text-zinc-100 disabled:opacity-50"
                      >
                        Undo
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={reset}
                      className="h-9 rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 text-sm text-zinc-300 hover:text-zinc-100"
                    >
                      Capture another
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-4 space-y-3">
                  <input
                    ref={inputRef}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && submit()}
                    placeholder={placeholder}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900/60 px-3 py-3 text-base text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-cyan-500/50"
                  />

                  {result && !result.ok && <p className="text-sm text-amber-400">{result.message}</p>}

                  {picker && candidates.length > 0 && (
                    <div>
                      <p className="mb-1.5 text-xs text-zinc-500">Send to…</p>
                      <div className="flex flex-wrap gap-2">
                        {candidates.map((c) => (
                          <button
                            key={c.appId}
                            type="button"
                            onClick={() => pick(c.appId)}
                            disabled={pending}
                            className="flex h-9 items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900/40 px-3 text-sm text-zinc-300 hover:border-cyan-500/40 hover:text-zinc-100 disabled:opacity-50"
                          >
                            <span aria-hidden>{c.icon}</span>
                            {c.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={submit}
                    disabled={pending || !text.trim()}
                    className="h-11 w-full rounded-xl bg-cyan-500 text-sm font-semibold text-zinc-950 hover:bg-cyan-400 disabled:opacity-50"
                  >
                    {pending ? "Logging…" : "Capture"}
                  </button>
                </div>
              )}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
