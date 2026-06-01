import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { Shell } from "@/components/modern/Shell";
import { SignOutButton } from "@/components/modern/SignOutButton";
import { isAdmin } from "@/lib/modern/admin";
import { ThemeToggle } from "@/components/modern/ThemeToggle";
import { isThemePref, type ThemePref } from "@/lib/theme";

export const dynamic = "force-dynamic";

/**
 * Settings hub — the destination for the bottom-nav "Settings" tab. Groups the
 * account/system screens (profile, notification prefs, feedback) plus an
 * admins-only block, so they're reachable without hunting through the app grid.
 */
export default async function SettingsPage() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: profile } = await supabase
    .from("profiles")
    .select("handle, theme")
    .eq("id", user.id)
    .single();

  const themePref: ThemePref = isThemePref(profile?.theme) ? profile.theme : "auto";
  const admin = isAdmin(user.email);

  return (
    <Shell back={{ href: "/today", label: "Today" }} title="Settings" right={<SignOutButton />}>
      <div className="mb-5">
        <p className="text-sm text-zinc-400">Signed in as</p>
        <p className="text-lg font-semibold text-zinc-100">{profile?.handle ?? user.email}</p>
        {profile?.handle && user.email && (
          <p className="text-xs text-zinc-500">{user.email}</p>
        )}
      </div>

      <section className="mb-6">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">Appearance</h3>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
          <p className="mb-3 text-sm text-zinc-300">Theme</p>
          <ThemeToggle initial={themePref} />
          <p className="mt-3 text-xs text-zinc-500">
            “Auto” follows your phone’s light/dark setting.
          </p>
        </div>
      </section>

      <Section label="Account">
        <Row href="/app/notifications" icon="✉" name="Notifications" desc="Email digest & reminder preferences" />
        <Row href="/app/xp" icon="◈" name="Level & Progress" desc="XP, streaks, quests, achievements" />
        <Row href="/app/feedback" icon="✦" name="Feedback" desc="Send a suggestion or report a bug" />
      </Section>

      {admin && (
        <Section label="Administrator">
          <Row href="/app/feedback" icon="🛡" name="Feedback Review" desc="Approve submissions → GitHub" admin />
          <Row href="/app/admin/health" icon="✓" name="Data Health" desc="Per-app data audit" admin />
        </Section>
      )}

      <div className="mt-8">
        <Link href="/apps" className="block text-center text-sm text-cyan-400 hover:text-cyan-300">
          Browse all apps →
        </Link>
      </div>
    </Shell>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="mb-6">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">{label}</h3>
      <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/40">{children}</div>
    </section>
  );
}

function Row({
  href,
  icon,
  name,
  desc,
  admin = false,
}: {
  href: string;
  icon: string;
  name: string;
  desc: string;
  admin?: boolean;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 border-b border-zinc-800/60 px-4 py-3 last:border-b-0 transition hover:bg-zinc-900 active:bg-zinc-800"
    >
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-base ring-1 ${
          admin
            ? "bg-amber-500/10 text-amber-400 ring-amber-500/20"
            : "bg-cyan-500/10 text-cyan-400 ring-cyan-500/20"
        }`}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-zinc-100">{name}</span>
        <span className="block truncate text-xs text-zinc-500">{desc}</span>
      </span>
      <span aria-hidden className="text-zinc-600">›</span>
    </Link>
  );
}
