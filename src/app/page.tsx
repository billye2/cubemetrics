import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { Shell, Card } from "@/components/modern/Shell";

export const dynamic = "force-dynamic";

export default async function Home() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return <Landing />;
  // Logged-in home is the Today ritual; the full app grid lives at /apps.
  redirect("/today");
}

function Landing() {
  return (
    <Shell>
      <div className="flex flex-col items-center py-12 text-center">
        <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-cyan-500/10 text-3xl text-cyan-400 ring-1 ring-cyan-500/30">
          ◧
        </div>
        <h1 className="text-3xl font-bold tracking-tight">XP Boost</h1>
        <p className="mt-2 max-w-md text-zinc-400">
          A personal productivity hub with 50+ tiny apps for tracking your time, tasks, habits, and life.
        </p>
        <a
          href="/api/auth/login"
          className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-cyan-500 px-6 text-sm font-semibold text-zinc-950 hover:bg-cyan-400 active:scale-[0.98]"
        >
          Sign in with Google
        </a>
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
