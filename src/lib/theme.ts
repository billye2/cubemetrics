// Shared theme types + the single place that applies a preference to the DOM.
// Keep in sync with the inline THEME_INIT script in app/layout.tsx.

export type ThemePref = "light" | "dark" | "auto";
export const THEME_KEY = "xpb-theme";

export function isThemePref(v: unknown): v is ThemePref {
  return v === "light" || v === "dark" || v === "auto";
}

/** Resolve a preference to a concrete theme, consulting the OS for "auto". */
export function resolveTheme(pref: ThemePref): "light" | "dark" {
  if (pref === "light" || pref === "dark") return pref;
  if (typeof window !== "undefined" && window.matchMedia) {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return "dark"; // dark is the app default
}

/** Apply a preference: set data-theme on <html> + cache it in localStorage. */
export function applyTheme(pref: ThemePref): void {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-theme", resolveTheme(pref));
  try {
    localStorage.setItem(THEME_KEY, pref);
  } catch {
    /* private mode / disabled storage — non-fatal */
  }
}

/** The cached preference (localStorage), defaulting to "auto". */
export function readThemePref(): ThemePref {
  if (typeof localStorage === "undefined") return "auto";
  try {
    const v = localStorage.getItem(THEME_KEY);
    return isThemePref(v) ? v : "auto";
  } catch {
    return "auto";
  }
}
