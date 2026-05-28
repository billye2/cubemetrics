import Link from "next/link";
import { createServerSupabase } from "@/lib/supabase/server";
import { Shell, Card } from "@/components/modern/Shell";
import { APPS, CATEGORIES } from "@/lib/modern/catalog";
import { SignOutButton } from "@/components/modern/SignOutButton";

export const dynamic = "force-dynamic";

export default async function Home() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return <Landing />;

  const { data: profile } = await supabase
    .from("profiles")
    .select("handle")
    .eq("id", user.id)
    .single();

  const { data: session } = await supabase
    .from("bbs_sessions")
    .select("recent_doors")
    .eq("user_id", user.id)
    .single();

  const recentIds: string[] = (session?.recent_doors as string[] | undefined) ?? [];
  const recentApps = recentIds
    .map((id) => APPS.find((a) => a.id === id))
    .filter((a): a is NonNullable<typeof a> => !!a)
    .slice(0, 4);

  return (
    <Shell
      right={
        <>
          <Link
            href="/classic"
            className="rounded-lg px-2 py-1 text-xs font-medium text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
          >
            Classic
          </Link>
          <SignOutButton />
        </>
      }
    >
      <div className="mb-6">
        <p className="text-sm text-zinc-400">Welcome back</p>
        <h2 className="mt-0.5 text-2xl font-bold tracking-tight">{profile?.handle ?? "Friend"}</h2>
      </div>

      {recentApps.length > 0 && (
        <section className="mb-8">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">Recent</h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {recentApps.map((app) => (
              <AppTile key={app.id} app={app} />
            ))}
          </div>
        </section>
      )}

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

function AppTile({ app }: { app: (typeof APPS)[number] }) {
  return (
    <Link
      href={`/app/${app.id}`}
      className="group relative flex flex-col rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4 transition active:scale-[0.98] hover:border-zinc-700 hover:bg-zinc-900"
    >
      <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 text-xl text-cyan-400 ring-1 ring-cyan-500/20">
        {app.icon}
      </div>
      <div className="text-sm font-semibold text-zinc-100">{app.name}</div>
      <div className="text-xs text-zinc-500 line-clamp-1">{app.description}</div>
      {!app.modern && (
        <span className="absolute right-2 top-2 rounded-full bg-zinc-800 px-1.5 py-0.5 text-[10px] font-medium text-zinc-400">classic</span>
      )}
    </Link>
  );
}

function Landing() {
  return (
    <Shell>
      <div className="flex flex-col items-center py-12 text-center">
        <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-cyan-500/10 text-3xl text-cyan-400 ring-1 ring-cyan-500/30">
          ◧
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Cubemetrics</h1>
        <p className="mt-2 max-w-md text-zinc-400">
          A personal productivity hub with 50+ tiny apps for tracking your time, tasks, habits, and life.
        </p>
        <a
          href="/api/auth/login"
          className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-cyan-500 px-6 text-sm font-semibold text-zinc-950 hover:bg-cyan-400 active:scale-[0.98]"
        >
          Sign in with Google
        </a>
        <Link href="/classic" className="mt-3 text-xs text-zinc-500 hover:text-zinc-300">
          Or use the classic terminal →
        </Link>
      </div>

      <Card className="p-5">
        <h3 className="text-sm font-semibold text-zinc-200">What&apos;s inside</h3>
        <ul className="mt-3 space-y-2 text-sm text-zinc-400">
          <li>• Todo, journal, notes, goals, habits, expenses…</li>
          <li>• Single sign-in with Google</li>
          <li>• Phone and desktop friendly</li>
          <li>• Your data stays in Supabase under your account</li>
        </ul>
      </Card>
    </Shell>
  );
}
