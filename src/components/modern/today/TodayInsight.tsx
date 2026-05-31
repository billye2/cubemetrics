"use client";
import { useEffect, useState } from "react";
import { fetchTodayNudge } from "@/lib/ai/actions";

/** Progressive insight line under the Today greeting — fetched after mount so it
 *  never blocks the page render. Renders nothing when there's nothing to say. */
export function TodayInsight() {
  const [line, setLine] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    fetchTodayNudge()
      .then((l) => alive && setLine(l))
      .catch(() => alive && setLine(""));
    return () => {
      alive = false;
    };
  }, []);

  if (line === null) return <div className="mt-2 h-4 w-2/3 animate-pulse rounded bg-zinc-800/60" />;
  if (line === "") return null;
  return <p className="mt-2 text-sm text-cyan-300/90">{line}</p>;
}
