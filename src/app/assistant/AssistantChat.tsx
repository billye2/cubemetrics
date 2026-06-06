"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { sendToAssistant } from "./actions";
import type { ChatMessage } from "@/lib/agent/run";

interface Msg extends ChatMessage {
  entries?: string[];
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
  onerror: (() => void) | null;
};

function getRecognition(): Recognition | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
  const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  return Ctor ? new Ctor() : null;
}

const GREETING =
  "Hi — tell me what to log. Try “I drank two glasses of water”, “add milk to my grocery list”, or “remind me to call the dentist”.";

export function AssistantChat() {
  const [messages, setMessages] = useState<Msg[]>([{ role: "assistant", content: GREETING }]);
  const [input, setInput] = useState("");
  const [pending, start] = useTransition();
  const [listening, setListening] = useState(false);
  const [speak, setSpeak] = useState(false);
  const recRef = useRef<Recognition | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const voiceSupported = typeof window !== "undefined" && !!getRecognition();

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
      setMessages((m) => [...m, { role: "assistant", content: res.reply, entries: res.entries }]);
      say(res.reply);
    });
  }

  function toggleMic() {
    if (listening) {
      recRef.current?.stop();
      return;
    }
    const rec = getRecognition();
    if (!rec) return;
    rec.lang = "en-US";
    rec.interimResults = false;
    rec.continuous = false;
    rec.onresult = (e) => {
      const transcript = Array.from({ length: e.results.length }, (_, i) => e.results[i][0].transcript).join(" ");
      send(transcript); // hands-free: speak → auto-send
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recRef.current = rec;
    setListening(true);
    rec.start();
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
              {m.entries && m.entries.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {m.entries.map((e, j) => (
                    <span
                      key={j}
                      className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-300 ring-1 ring-emerald-500/30"
                    >
                      ✓ {e}
                    </span>
                  ))}
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

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="sticky bottom-0 mt-4 flex items-center gap-2 bg-gradient-to-t from-zinc-950 via-zinc-950 to-transparent pb-1 pt-2"
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

      {voiceSupported && (
        <label className="mt-2 flex items-center justify-end gap-2 px-1 text-xs text-zinc-500">
          <input
            type="checkbox"
            checked={speak}
            onChange={(e) => setSpeak(e.target.checked)}
            className="accent-cyan-500"
          />
          Speak responses
        </label>
      )}
    </div>
  );
}
