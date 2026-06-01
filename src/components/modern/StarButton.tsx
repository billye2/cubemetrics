"use client";

import { useState, useTransition } from "react";
import { toggleFavorite } from "@/lib/spine/favorites";

/**
 * Star toggle for an app tile — GitHub-style favorite. Rendered as an absolutely
 * positioned overlay (a SIBLING of the tile's <Link>, never a child of it, since
 * a <button> inside an <a> is invalid). Optimistic: flips immediately, reconciles
 * with the server action's returned state.
 */
export function StarButton({ appId, initial }: { appId: string; initial: boolean }) {
  const [pinned, setPinned] = useState(initial);
  const [pending, start] = useTransition();

  function toggle() {
    const optimistic = !pinned;
    setPinned(optimistic);
    start(async () => {
      const res = await toggleFavorite(appId);
      // Reconcile (revert if the write failed).
      setPinned(res.ok ? res.pinned : !optimistic);
    });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      aria-pressed={pinned}
      aria-label={pinned ? "Remove from favorites" : "Add to favorites"}
      title={pinned ? "Unstar" : "Star"}
      className={`absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-lg transition active:scale-90 ${
        pinned ? "text-amber-400" : "text-zinc-600 hover:text-zinc-400"
      } disabled:opacity-50`}
    >
      <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill={pinned ? "currentColor" : "none"} stroke="currentColor" strokeWidth={1.7} strokeLinejoin="round">
        <path d="M12 3.5l2.6 5.27 5.82.85-4.21 4.1.99 5.78L12 16.77l-5.2 2.73.99-5.78-4.21-4.1 5.82-.85z" />
      </svg>
    </button>
  );
}
