import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { Shell } from "@/components/modern/Shell";
import { ensureXp } from "@/lib/xp/compute";

export const dynamic = "force-dynamic";

const BAR_COLORS = ["bg-cyan-500", "bg-emerald-500", "bg-amber-500", "bg-violet-500", "bg-rose-500", "bg-sky-500", "bg-lime-500", "bg-fuchsia-500"];

export default async function XpPage() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const xp = await ensureXp(supabase, user.id);
  const { level, streak, longestStreak, todayPoints, dailySeries, breakdownTotals, achievements, todayQuests, questsCompletedToday } = xp;

  const chartMax = Math.max(1, ...dailySeries.map((d) => d.points));
  const breakdownMax = Math.max(1, ...breakdownTotals.map((b) => b.points));
  const unlockedCount = achievements.filter((a) => a.unlocked).length;

  return (
    <Shell back={{ href: "/apps", label: "Apps" }} title="Level">
      {/* Hero */}
      <div className="flex flex-col items-center rounded-3xl border border-zinc-800 bg-zinc-900/40 p-6">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-cyan-500/15 text-3xl font-bold text-cyan-300 ring-2 ring-cyan-500/40">
          {level.level}
        </div>
        <div className="mt-3 text-lg font-semibold text-zinc-100">{level.title}</div>
        <div className="text-xs text-zinc-500">{level.totalXp.toLocaleString()} XP total</div>
        <div className="mt-4 w-full max-w-xs">
          <div className="mb-1 flex justify-between text-xs text-zinc-400">
            <span>Level {level.level}</span>
            <span>Level {level.level + 1}</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-zinc-800">
            <div className="h-full rounded-full bg-cyan-500 transition-all" style={{ width: `${level.pct}%` }} />
          </div>
          <div className="mt-1 text-center text-xs text-zinc-500">{level.toNext.toLocaleString()} XP to level {level.level + 1}</div>
        </div>
      </div>

      {/* Stats strip */}
      <div className="mt-4 grid grid-cols-3 gap-3">
        <Stat label="Today" value={`+${todayPoints}`} accent />
        <Stat label="Streak" value={streak > 0 ? `${streak}🔥` : "—"} sub={streak === 1 ? "day" : "days"} />
        <Stat label="Best streak" value={longestStreak > 0 ? String(longestStreak) : "—"} sub="days" />
      </div>

      {/* Today's quests */}
      {todayQuests.length > 0 && (
        <div className="mt-6">
          <h3 className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-zinc-500">
            <span>Today&apos;s quests</span>
            <span className={questsCompletedToday === todayQuests.length ? "text-cyan-400" : "text-zinc-600"}>
              {questsCompletedToday}/{todayQuests.length}
              {questsCompletedToday === todayQuests.length ? " · +50 bonus!" : ""}
            </span>
          </h3>
          <ul className="space-y-2">
            {todayQuests.map((q) => {
              const pct = Math.min(100, Math.round((q.current / q.target) * 100));
              return (
                <li
                  key={q.key}
                  className={`flex items-center gap-3 rounded-2xl border p-3 ${
                    q.done ? "border-cyan-500/30 bg-cyan-500/5" : "border-zinc-800 bg-zinc-900/40"
                  }`}
                >
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-lg ${q.done ? "bg-cyan-500/15 text-cyan-300" : "bg-zinc-800 text-zinc-400"}`}>
                    {q.done ? "✓" : q.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className={`truncate text-sm font-semibold ${q.done ? "text-zinc-100" : "text-zinc-200"}`}>{q.label}</span>
                      <span className={`shrink-0 text-xs font-semibold ${q.done ? "text-cyan-400" : "text-zinc-500"}`}>+{q.reward}</span>
                    </div>
                    <div className="text-xs text-zinc-500">{q.description}</div>
                    {!q.done && (
                      <div className="mt-1.5 flex items-center gap-2">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-800">
                          <div className="h-full rounded-full bg-cyan-500/70" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-[10px] tabular-nums text-zinc-500">{q.current}/{q.target}</span>
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* 30-day XP chart */}
      <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
        <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">XP · last 30 days</div>
        <div className="flex h-24 items-end gap-0.5">
          {dailySeries.map((d) => {
            const h = d.points === 0 ? 3 : Math.max(6, Math.round((d.points / chartMax) * 100));
            return (
              <div
                key={d.day}
                title={`${d.day}: ${d.points} XP`}
                className={`flex-1 rounded-sm transition-all ${d.points === 0 ? "bg-zinc-800" : d.isToday ? "bg-cyan-400" : "bg-cyan-500/50"}`}
                style={{ height: `${h}%` }}
              />
            );
          })}
        </div>
      </div>

      {/* Breakdown by app */}
      {breakdownTotals.length > 0 && (
        <div className="mt-6">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">Where your XP came from · 30d</h3>
          <ul className="space-y-2">
            {breakdownTotals.map((b, i) => (
              <li key={b.source} className="flex items-center gap-2">
                <span className="w-24 shrink-0 truncate text-xs text-zinc-400">{b.label}</span>
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-zinc-800">
                  <div
                    className={`h-full rounded-full ${BAR_COLORS[i % BAR_COLORS.length]}`}
                    style={{ width: `${Math.max(4, Math.round((b.points / breakdownMax) * 100))}%` }}
                  />
                </div>
                <span className="w-12 shrink-0 text-right text-xs tabular-nums text-zinc-300">{b.points}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Achievements */}
      <div className="mt-6">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
          Achievements <span className="text-zinc-600">· {unlockedCount}/{achievements.length}</span>
        </h3>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {achievements.map((a) => (
            <div
              key={a.key}
              className={`relative flex flex-col items-center rounded-2xl border p-3 text-center ${
                a.unlocked ? "border-cyan-500/30 bg-cyan-500/5" : "border-zinc-800 bg-zinc-900/40"
              }`}
            >
              {a.isNew && (
                <span className="absolute -right-1 -top-1 rounded-full bg-cyan-500 px-1.5 py-0.5 text-[9px] font-bold text-zinc-950">new!</span>
              )}
              <div className={`text-2xl ${a.unlocked ? "" : "opacity-20 grayscale"}`}>{a.icon}</div>
              <div className={`mt-1 text-xs font-semibold ${a.unlocked ? "text-zinc-100" : "text-zinc-600"}`}>{a.name}</div>
              <div className="mt-0.5 text-[10px] leading-tight text-zinc-500">{a.description}</div>
            </div>
          ))}
        </div>
      </div>

      <p className="mt-6 text-center text-xs text-zinc-600">XP is earned automatically as you use every app. Keep a daily streak going.</p>
    </Shell>
  );
}

function Stat({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-3 text-center">
      <div className={`text-xl font-bold tracking-tight ${accent ? "text-cyan-400" : "text-zinc-100"}`}>{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-zinc-500">{sub ? `${label} · ${sub}` : label}</div>
    </div>
  );
}
