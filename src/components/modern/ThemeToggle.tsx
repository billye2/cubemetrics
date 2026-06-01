"use client";

import { useState, useTransition } from "react";
import { applyTheme, type ThemePref } from "@/lib/theme";
import { setTheme } from "@/lib/theme-actions";

const OPTIONS: { value: ThemePref; label: string; icon: string }[] = [
  { value: "light", label: "Light", icon: "☀" },
  { value: "dark", label: "Dark", icon: "☾" },
  { value: "auto", label: "Auto", icon: "◐" },
];

/**
 * Segmented Light / Dark / Auto control (Settings). Optimistic: applies to the
 * DOM + localStorage instantly via applyTheme, then persists to the profile so
 * the choice follows the user across devices. "Auto" follows the OS.
 */
export function ThemeToggle({ initial }: { initial: ThemePref }) {
  const [pref, setPref] = useState<ThemePref>(initial);
  const [, start] = useTransition();

  function choose(next: ThemePref) {
    setPref(next);
    applyTheme(next); // instant, no flash
    start(async () => {
      await setTheme(next); // cross-device sync (best-effort)
    });
  }

  return (
    <div
      role="radiogroup"
      aria-label="Theme"
      className="inline-flex w-full max-w-xs rounded-xl border border-zinc-800 bg-zinc-900/40 p-1"
    >
      {OPTIONS.map((o) => {
        const active = pref === o.value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => choose(o.value)}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition ${
              active
                ? "bg-cyan-500/15 text-cyan-300 ring-1 ring-cyan-500/40"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <span aria-hidden>{o.icon}</span>
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
