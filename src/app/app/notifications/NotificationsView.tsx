"use client";

import { useState, useTransition } from "react";
import { saveNotificationPrefs } from "./actions";

interface Prefs {
  email_enabled: boolean;
  morning_enabled: boolean;
  evening_enabled: boolean;
  morning_time: string;
  evening_time: string;
  streak_save_enabled: boolean;
  ai_insights_enabled: boolean;
}

function Toggle({
  on,
  onClick,
  label,
}: {
  on: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={onClick}
      className={`flex h-11 min-h-11 items-center justify-between gap-3 rounded-xl border px-4 text-sm font-medium transition ${
        on
          ? "border-cyan-500 bg-cyan-500/10 text-cyan-300"
          : "border-zinc-800 bg-zinc-900/40 text-zinc-400 hover:text-zinc-200"
      }`}
    >
      <span>{label}</span>
      <span
        aria-hidden
        className={`relative inline-block h-6 w-10 shrink-0 rounded-full transition ${
          on ? "bg-cyan-500" : "bg-zinc-700"
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-zinc-950 transition-all ${
            on ? "left-[1.125rem]" : "left-0.5"
          }`}
        />
      </span>
    </button>
  );
}

export function NotificationsView({ prefs }: { prefs: Prefs }) {
  const [state, setState] = useState<Prefs>(prefs);
  const [pending, start] = useTransition();
  const [saved, setSaved] = useState(false);

  function set<K extends keyof Prefs>(key: K, value: Prefs[K]) {
    setState((s) => ({ ...s, [key]: value }));
    setSaved(false);
  }

  function save() {
    start(async () => {
      await saveNotificationPrefs(state);
      setSaved(true);
      setTimeout(() => setSaved(false), 1800);
    });
  }

  return (
    <div className="space-y-5">
      <p className="text-sm text-zinc-400">
        Digests are opt-in. We only email when there&apos;s something worth your
        attention.
      </p>

      <Toggle
        on={state.email_enabled}
        onClick={() => set("email_enabled", !state.email_enabled)}
        label="Email digests"
      />

      {state.email_enabled && (
        <div className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
          <div className="space-y-2">
            <Toggle
              on={state.morning_enabled}
              onClick={() => set("morning_enabled", !state.morning_enabled)}
              label="Morning digest"
            />
            {state.morning_enabled && (
              <label className="flex h-11 items-center justify-between gap-3 px-1 text-sm text-zinc-300">
                <span>Send at</span>
                <input
                  type="time"
                  value={state.morning_time}
                  onChange={(e) => set("morning_time", e.target.value)}
                  className="h-9 rounded-lg border border-zinc-800 bg-zinc-900 px-3 text-sm text-zinc-100 outline-none focus:border-cyan-500/50"
                />
              </label>
            )}
          </div>

          <div className="space-y-2">
            <Toggle
              on={state.evening_enabled}
              onClick={() => set("evening_enabled", !state.evening_enabled)}
              label="Evening digest"
            />
            {state.evening_enabled && (
              <label className="flex h-11 items-center justify-between gap-3 px-1 text-sm text-zinc-300">
                <span>Send at</span>
                <input
                  type="time"
                  value={state.evening_time}
                  onChange={(e) => set("evening_time", e.target.value)}
                  className="h-9 rounded-lg border border-zinc-800 bg-zinc-900 px-3 text-sm text-zinc-100 outline-none focus:border-cyan-500/50"
                />
              </label>
            )}
          </div>

          <Toggle
            on={state.streak_save_enabled}
            onClick={() => set("streak_save_enabled", !state.streak_save_enabled)}
            label="Streak-save alerts"
          />

          <div className="space-y-2">
            <Toggle
              on={state.ai_insights_enabled}
              onClick={() =>
                set("ai_insights_enabled", !state.ai_insights_enabled)
              }
              label="AI insight line"
            />
            <p className="px-1 text-xs text-zinc-500">
              Sends a structured summary of your day to an AI provider to write
              one encouraging line. No raw notes leave your account beyond that
              summary; turn this off to keep digests fully local.
            </p>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={save}
        disabled={pending}
        className="h-11 w-full rounded-xl bg-cyan-500 text-sm font-semibold text-zinc-950 hover:bg-cyan-400 disabled:opacity-50"
      >
        {saved ? "Saved ✓" : pending ? "Saving…" : "Save"}
      </button>
    </div>
  );
}
