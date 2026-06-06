import Link from "next/link";
import type { ensureXp } from "@/lib/xp/compute";
import type { Mode } from "@/lib/spine/today-view";
import { TodayInsight } from "./TodayInsight";

type Xp = NonNullable<Awaited<ReturnType<typeof ensureXp>>>;

const GREETING: Record<Mode, string> = {
  morning: "Plan your day",
  day: "Today",
  evening: "Close out your day",
};

export function TodayHeader({
  mode,
  name,
  xp,
  focus,
}: {
  mode: Mode;
  name: string;
  xp: Xp | null;
  focus?: string | null;
}) {
  return (
    <div className="mb-5">
      <p className="text-sm text-zinc-400">{GREETING[mode]}</p>
      <h2 className="mt-0.5 text-2xl font-bold tracking-tight">{name}</h2>
      {focus && (
        <p className="mt-1 text-sm text-cyan-400">
          <span aria-hidden>✦ </span>
          Focused on {focus}
        </p>
      )}
      <TodayInsight />

      {xp && (
        <Link
          href="/app/xp"
          className="mt-3 flex items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-3 transition hover:border-cyan-500/40 hover:bg-zinc-900 active:scale-[0.99]"
        >
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-cyan-500/15 text-base font-bold text-cyan-300 ring-1 ring-cyan-500/40">
            {xp.level.level}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-semibold text-zinc-100">{xp.level.title}</span>
              <span className="text-xs text-zinc-500">+{xp.todayPoints} today</span>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-zinc-800">
              <div className="h-full rounded-full bg-cyan-500" style={{ width: `${xp.level.pct}%` }} />
            </div>
          </div>
          <div className="shrink-0 text-right">
            <div className="text-base font-bold text-cyan-400">{xp.streak > 0 ? `${xp.streak}🔥` : "—"}</div>
            <div className="text-[10px] text-zinc-500">streak</div>
          </div>
        </Link>
      )}

      {xp && xp.todayQuests.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {xp.todayQuests.map((q) => (
            <span
              key={q.key}
              className={`flex items-center gap-1 rounded-lg border px-2 py-1 text-xs ${
                q.done
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                  : "border-zinc-800 bg-zinc-900/40 text-zinc-400"
              }`}
            >
              <span aria-hidden>{q.icon}</span>
              {q.label} {q.current}/{q.target}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
