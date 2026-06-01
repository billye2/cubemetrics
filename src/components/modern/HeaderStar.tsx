"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname } from "next/navigation";
import { getApp } from "@/lib/modern/catalog";
import { isFavorite, toggleFavorite } from "@/lib/spine/favorites";

/**
 * Header star shown on every individual app page, mirroring <HeaderFeedback>:
 * derives the app id from the route, self-hides off /app/<id> (and on system
 * apps with no catalog entry). Loads the current starred state on mount, then
 * toggles it optimistically — same favorites store (app_usage.pinned) as the
 * grid/Favorites tab.
 */
export function HeaderStar() {
  const pathname = usePathname();
  const appId = pathname?.startsWith("/app/") ? pathname.split("/")[2] || "" : "";

  const [pinned, setPinned] = useState<boolean | null>(null); // null = not loaded yet
  const [pending, start] = useTransition();

  useEffect(() => {
    let alive = true;
    if (!appId) return;
    void isFavorite(appId).then((v) => {
      if (alive) setPinned(v);
    });
    return () => {
      alive = false;
    };
  }, [appId]);

  // Off an app route, or an app id with no catalog entry (e.g. /app/feedback,
  // /app/admin/health) → no star.
  if (!appId || !getApp(appId)) return null;

  function toggle() {
    const optimistic = !(pinned ?? false);
    setPinned(optimistic);
    start(async () => {
      const res = await toggleFavorite(appId);
      setPinned(res.ok ? res.pinned : !optimistic);
    });
  }

  const isOn = pinned ?? false;
  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending || pinned === null}
      aria-pressed={isOn}
      aria-label={isOn ? "Remove from favorites" : "Add to favorites"}
      title={isOn ? "Unstar" : "Star"}
      className={`flex h-9 w-9 items-center justify-center rounded-lg border transition active:scale-90 ${
        isOn
          ? "border-amber-500/40 bg-amber-500/10 text-amber-400"
          : "border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
      } disabled:opacity-50`}
    >
      <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill={isOn ? "currentColor" : "none"} stroke="currentColor" strokeWidth={1.7} strokeLinejoin="round">
        <path d="M12 3.5l2.6 5.27 5.82.85-4.21 4.1.99 5.78L12 16.77l-5.2 2.73.99-5.78-4.21-4.1 5.82-.85z" />
      </svg>
    </button>
  );
}
