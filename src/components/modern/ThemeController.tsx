"use client";

import { useEffect } from "react";
import { applyTheme, readThemePref, type ThemePref } from "@/lib/theme";

/**
 * Runtime theme keeper (renders nothing). Mounted in <Shell>:
 *  1. Reconciles the server-stored preference (cross-device source of truth)
 *     into the local cache + DOM on load, if it differs from what's cached.
 *  2. While the preference is "auto", re-applies on OS light/dark changes so the
 *     app live-follows the system without a reload.
 * The pre-paint inline script in layout already set the initial theme; this just
 * keeps it correct afterwards.
 */
export function ThemeController({ serverPref }: { serverPref: ThemePref }) {
  useEffect(() => {
    // DB wins across devices: if the synced pref differs from the local cache,
    // adopt it (covers "changed it on another device").
    if (readThemePref() !== serverPref) applyTheme(serverPref);
  }, [serverPref]);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      if (readThemePref() === "auto") applyTheme("auto");
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return null;
}
