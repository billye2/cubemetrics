"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { sendToAssistant, applyProposals, undoAppliedEntry } from "./actions";
import type { ChatMessage, Proposal, AppliedEntry } from "@/lib/agent/run";

interface Msg extends ChatMessage {
  proposals?: Proposal[]; // pending writes awaiting confirmation
  applied?: AppliedEntry[]; // confirmed + written this turn
  undone?: boolean[]; // per-applied-entry undo state
}

// Minimal shape for the browser SpeechRecognition API (not in the standard DOM lib types).
type Recognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error?: string }) => void) | null;
};

type RecognitionCtor = new () => Recognition;

/** The SpeechRecognition constructor if this browser has it (Chrome/Edge/Safari; not Firefox). */
function speechCtor(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: RecognitionCtor;
    webkitSpeechRecognition?: RecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

const GREETING =
  "Hi — tell me what to log. Try “I drank two glasses of water”, “add milk to my grocery list”, or “remind me to call the dentist”.";

export function AssistantChat() {
  const [messages, setMessages] = useState<Msg[]>([{ role: "assistant", content: GREETING }]);
  const [input, setInput] = useState("");
  const [pending, start] = useTransition();
  const [busy, startBusy] = useTransition(); // apply / undo
  const [deselected, setDeselected] = useState<Record<string, boolean>>({});
  const [listening, setListening] = useState(false);
  const [speak, setSpeak] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [micNote, setMicNote] = useState<string | null>(null);
  const recRef = useRef<Recognition | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  // Detect support after mount (avoids SSR/hydration mismatch and per-render construction).
  useEffect(() => {
    setVoiceSupported(!!speechCtor());
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, pending]);

  function say(text: string) {
    if (!speak || typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(new SpeechSynthesisUtterance(text));
  }

  function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || pending) return;
    const history: Msg[] = [...messages, { role: "user", content: trimmed }];
    setMessages(history);
    setInput("");
    start(async () => {
      const res = await sendToAssistant(history.map((m) => ({ role: m.role, content: m.content })));
      setMessages((m) => [...m, { role: "assistant", content: res.reply, proposals: res.proposals }]);
      say(res.reply);
    });
  }

  // Proposals are checked by default; we only track explicit de-selections (keyed per message).
  const key = (msgIdx: number, pid: string) => `${msgIdx}:${pid}`;
  const isChecked = (msgIdx: number, pid: string) => !deselected[key(msgIdx, pid)];

  function applyMsg(msgIdx: number, proposals: Proposal[]) {
    const chosen = proposals.filter((p) => isChecked(msgIdx, p.id));
    if (!chosen.length) return;
    startBusy(async () => {
      const applied = await applyProposals(chosen);
      setMessages((ms) =>
        ms.map((m, i) =>
          i === msgIdx ? { ...m, proposals: undefined, applied, undone: applied.map(() => false) } : m,
        ),
      );
    });
  }

  function dismissMsg(msgIdx: number) {
    setMessages((ms) => ms.map((m, i) => (i === msgIdx ? { ...m, proposals: undefined } : m)));
  }

  function undoMsg(msgIdx: number, entryIdx: number, entry: AppliedEntry) {
    startBusy(async () => {
      const ok = await undoAppliedEntry(entry.undo);
      if (!ok) return;
      setMessages((ms) =>
        ms.map((m, i) =>
          i === msgIdx && m.undone
            ? { ...m, undone: m.undone.map((u, j) => (j === entryIdx ? true : u)) }
            : m,
        ),
      );
    });
  }

  const BLOCKED_MSG =
    "Microphone blocked. Click the lock/ⓘ icon in the address bar → Site settings → Microphone → Allow, then reload.";

  async function toggleMic() {
    setMicNote(null);
    if (listening) {
      recRef.current?.stop();
      setListening(false);
      return;
    }
    const Ctor = speechCtor();
    if (!Ctor) {
      setMicNote("Voice input isn't supported in this browser — try Chrome.");
      return;
    }
    // Explicitly request mic permission first — SpeechRecognition alone often fails
    // to surface the prompt and just reports "blocked". getUserMedia reliably prompts;
    // once granted (persisted for the origin) recognition won't re-ask.
    try {
      if (navigator.mediaDevices?.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((t) => t.stop()); // release; recognition opens its own
      }
    } catch {
      setMicNote(BLOCKED_MSG);
      return;
    }
    let rec: Recognition;
    try {
      rec = new Ctor();
    } catch {
      setMicNote("Couldn't start voice input.");
      return;
    }
    rec.lang = "en-US";
    rec.interimResults = false;
    rec.continuous = false;
    rec.onresult = (e) => {
      const transcript = Array.from({ length: e.results.length }, (_, i) => e.results[i][0].transcript).join(" ");
      if (transcript.trim()) send(transcript); // hands-free: speak → auto-send
    };
    rec.onend = () => setListening(false);
    rec.onerror = (ev) => {
      setListening(false);
      const err = ev?.error;
      setMicNote(
        err === "not-allowed" || err === "service-not-allowed"
          ? BLOCKED_MSG
          : err === "no-speech"
            ? "Didn't catch anything — tap the mic and try again."
            : err === "audio-capture"
              ? "No microphone found."
              : "Voice input error — try again.",
      );
    };
    recRef.current = rec;
    setListening(true);
    try {
      rec.start();
    } catch {
      setListening(false);
      setMicNote("Couldn't start the mic — try again.");
    }
  }

  return (
    <div className="flex flex-col" style={{ minHeight: "60vh" }}>
      <div className="flex-1 space-y-3">
        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
            <div
              className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm ${
                m.role === "user"
                  ? "bg-cyan-500 text-zinc-950"
                  : "border border-zinc-800 bg-zinc-900/60 text-zinc-100"
              }`}
            >
              <div className="whitespace-pre-wrap break-words">{m.content}</div>

              {/* Proposed writes — confirm before anything is saved. */}
              {m.proposals && m.proposals.length > 0 && (
                <div className="mt-2.5 space-y-1.5">
                  {m.proposals.map((p) => (
                    <label key={p.id} className="flex items-center gap-2 text-sm text-zinc-200">
                      <input
                        type="checkbox"
                        checked={isChecked(i, p.id)}
                        onChange={(e) =>
                          setDeselected((d) => ({ ...d, [key(i, p.id)]: !e.target.checked }))
                        }
                        className="h-4 w-4 accent-cyan-500"
                      />
                      <span>{p.label}</span>
                    </label>
                  ))}
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      disabled={busy || !m.proposals.some((p) => isChecked(i, p.id))}
                      onClick={() => applyMsg(i, m.proposals!)}
                      className="rounded-full bg-cyan-500 px-3.5 py-1 text-xs font-semibold text-zinc-950 hover:bg-cyan-400 disabled:opacity-50"
                    >
                      Confirm
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => dismissMsg(i)}
                      className="rounded-full px-2 py-1 text-xs text-zinc-500 hover:text-zinc-300"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              )}

              {/* Applied entries — each undoable. */}
              {m.applied && m.applied.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {m.applied.map((e, j) =>
                    m.undone?.[j] ? (
                      <span key={j} className="rounded-full px-2 py-0.5 text-xs text-zinc-500 line-through">
                        {e.label}
                      </span>
                    ) : (
                      <span
                        key={j}
                        className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-300 ring-1 ring-emerald-500/30"
                      >
                        ✓ {e.label}
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => undoMsg(i, j, e)}
                          className="text-emerald-400/70 hover:text-emerald-200 disabled:opacity-50"
                          aria-label={`Undo ${e.label}`}
                        >
                          ↶
                        </button>
                      </span>
                    ),
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
        {pending && (
          <div className="flex justify-start">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 px-3.5 py-2.5 text-sm text-zinc-500">
              …
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {(listening || micNote) && (
        <div
          className={`mt-3 px-1 text-xs ${listening ? "text-cyan-400" : "text-amber-400/90"}`}
          role="status"
        >
          {listening ? "Listening… speak now." : micNote}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="sticky bottom-0 mt-2 flex items-center gap-2 bg-gradient-to-t from-zinc-950 via-zinc-950 to-transparent pb-1 pt-2"
      >
        {voiceSupported && (
          <button
            type="button"
            onClick={toggleMic}
            aria-label={listening ? "Stop listening" : "Speak"}
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border transition ${
              listening
                ? "animate-pulse border-cyan-500 bg-cyan-500/15 text-cyan-300"
                : "border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="3" width="6" height="11" rx="3" />
              <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
            </svg>
          </button>
        )}
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Log something…"
          className="h-11 flex-1 rounded-full border border-zinc-800 bg-zinc-900/60 px-4 text-base text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-cyan-500/50"
        />
        <button
          type="submit"
          disabled={pending || !input.trim()}
          className="h-11 shrink-0 rounded-full bg-cyan-500 px-5 text-sm font-semibold text-zinc-950 hover:bg-cyan-400 disabled:opacity-50"
        >
          Send
        </button>
      </form>

      {voiceSupported ? (
        <label className="mt-2 flex items-center justify-end gap-2 px-1 text-xs text-zinc-500">
          <input
            type="checkbox"
            checked={speak}
            onChange={(e) => setSpeak(e.target.checked)}
            className="accent-cyan-500"
          />
          Speak responses
        </label>
      ) : (
        // No Web Speech API here (e.g. Chrome/Firefox on iPhone, which are WebKit-only and
        // don't expose it). No server-side fallback by choice — just say where voice works.
        <p className="mt-2 px-1 text-right text-xs text-zinc-600">
          Voice input needs Safari on iPhone, or Chrome on desktop.
        </p>
      )}
    </div>
  );
}
