import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { Shell } from "@/components/modern/Shell";
import { APPS, CATEGORIES } from "@/lib/modern/catalog";
import { SignOutButton } from "@/components/modern/SignOutButton";
import { AppSearch } from "@/components/modern/AppSearch";
import { TimezoneSync } from "@/components/modern/TimezoneSync";
import { ensureXp } from "@/lib/xp/compute";

export const dynamic = "force-dynamic";

export default async function AppsPage() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: profile } = await supabase
    .from("profiles")
    .select("handle, timezone")
    .eq("id", user.id)
    .single();

  // XP is best-effort — never let it block the grid from rendering.
  let xp = null;
  try {
    xp = await ensureXp(supabase, user.id);
  } catch {
    xp = null;
  }

  return (
    <Shell back={{ href: "/today", label: "Today" }} right={<SignOutButton />}>
      <TimezoneSync knownTz={profile?.timezone ?? null} />
      <div className="mb-4">
        <p className="text-sm text-zinc-400">All apps</p>
        <h2 className="mt-0.5 text-2xl font-bold tracking-tight">{profile?.handle ?? "Friend"}</h2>
      </div>

      {xp && <XpStrip xp={xp} />}

      <AppSearch apps={APPS} />

      {CATEGORIES.map((cat) => {
        const apps = APPS.filter((a) => a.category === cat.id);
        if (apps.length === 0) return null;
        return (
          <section key={cat.id} className="mb-8">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">{cat.label}</h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {apps.map((app) => (
                <AppTile key={app.id} app={app} />
              ))}
            </div>
          </section>
        );
      })}
    </Shell>
  );
}

function XpStrip({ xp }: { xp: NonNullable<Awaited<ReturnType<typeof ensureXp>>> }) {
  const { level, streak, todayPoints } = xp;
  return (
    <Link
      href="/app/xp"
      className="mb-5 flex items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-3 transition hover:border-cyan-500/40 hover:bg-zinc-900 active:scale-[0.99]"
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-cyan-500/15 text-base font-bold text-cyan-300 ring-1 ring-cyan-500/40">
        {level.level}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between">
          <span className="text-sm font-semibold text-zinc-100">{level.title}</span>
          <span className="text-xs text-zinc-500">{level.toNext.toLocaleString()} XP to L{level.level + 1}</span>
        </div>
        <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-zinc-800">
          <div className="h-full rounded-full bg-cyan-500" style={{ width: `${level.pct}%` }} />
        </div>
      </div>
      <div className="shrink-0 text-right">
        <div className="text-sm font-semibold text-cyan-400">{streak > 0 ? `${streak}🔥` : "—"}</div>
        <div className="text-[10px] text-zinc-500">+{todayPoints} today</div>
      </div>
    </Link>
  );
}

function AppTile({ app }: { app: (typeof APPS)[number] }) {
  return (
    <Link
      href={`/app/${app.id}`}
      className="group flex flex-col rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4 transition active:scale-[0.98] hover:border-zinc-700 hover:bg-zinc-900"
    >
      <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 text-xl text-cyan-400 ring-1 ring-cyan-500/20">
        {app.icon}
      </div>
      <div className="text-sm font-semibold text-zinc-100">{app.name}</div>
      <div className="text-xs text-zinc-500 line-clamp-1">{app.description}</div>
    </Link>
  );
}
