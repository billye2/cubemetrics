"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { AppEntry } from "@/lib/modern/catalog";

export function AppSearch({ apps }: { apps: AppEntry[] }) {
  const [q, setQ] = useState("");
  const query = q.trim().toLowerCase();

  const matches = useMemo(() => {
    if (!query) return [];
    return apps
      .filter(
        (a) =>
          a.name.toLowerCase().includes(query) ||
          a.description.toLowerCase().includes(query) ||
          a.id.toLowerCase().includes(query),
      )
      .slice(0, 8);
  }, [apps, query]);

  return (
    <div className="mb-6">
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">⌕</span>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search apps…"
          autoComplete="off"
          spellCheck={false}
          className="w-full rounded-xl border border-zinc-800 bg-zinc-900/60 py-2.5 pl-9 pr-3 text-base text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-cyan-500/50"
        />
      </div>
      {query && matches.length > 0 && (
        <div className="mt-2 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/90 shadow-lg backdrop-blur">
          {matches.map((a) => (
            <Link
              key={a.id}
              href={`/app/${a.id}`}
              className="flex items-center gap-3 border-b border-zinc-800/60 px-3 py-2.5 last:border-b-0 hover:bg-zinc-800"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/10 text-base text-cyan-400 ring-1 ring-cyan-500/20">
                {a.icon}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-zinc-100">{a.name}</div>
                <div className="truncate text-xs text-zinc-500">{a.description}</div>
              </div>
              {a.ui === "classic" && (
                <span className="rounded-full bg-zinc-800 px-1.5 py-0.5 text-[10px] font-medium text-zinc-400">classic</span>
              )}
            </Link>
          ))}
        </div>
      )}
      {query && matches.length === 0 && (
        <div className="mt-2 rounded-xl border border-zinc-800 bg-zinc-900/40 px-3 py-2.5 text-sm text-zinc-500">
          No apps match &ldquo;{query}&rdquo;
        </div>
      )}
    </div>
  );
}
