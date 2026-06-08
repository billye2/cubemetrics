import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { Shell } from "@/components/modern/Shell";
import { APPS, CATEGORIES } from "@/lib/modern/catalog";
import { SignOutButton } from "@/components/modern/SignOutButton";
import { AppSearch } from "@/components/modern/AppSearch";
import { TimezoneSync } from "@/components/modern/TimezoneSync";
import { ensureXp } from "@/lib/xp/compute";
import { isAdmin, ADMIN_APP_IDS } from "@/lib/modern/admin";
import { getFavoriteIds } from "@/lib/spine/favorites";
import { StarButton } from "@/components/modern/StarButton";
import { categoryIconStyle } from "@/lib/modern/catalog";

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

  const favoriteIds = new Set(await getFavoriteIds().catch(() => []));
  const admin = await isAdmin(user.email);

  // System/admin tools are pulled out of the normal grid; they live in the
  // admins-only Administrator section below so they don't look like empty apps.
  const gridApps = APPS.filter((a) => !ADMIN_APP_IDS.has(a.id) && !a.hidden);
  // Search can find system apps for admins, but hides them from regular users.
  // Hidden (retired/redundant) apps never surface in search for anyone.
  const searchApps = (admin ? APPS : gridApps).filter((a) => !a.hidden);
  // Starred apps get their own section at the very top (catalog order preserved).
  const favorites = gridApps.filter((a) => favoriteIds.has(a.id));

  return (
    <Shell back={{ href: "/today", label: "Today" }} right={<SignOutButton />}>
      <TimezoneSync knownTz={profile?.timezone ?? null} />
      <div className="mb-4">
        <p className="text-sm text-zinc-400">All apps</p>
        <h2 className="mt-0.5 text-2xl font-bold tracking-tight">{profile?.handle ?? "Friend"}</h2>
      </div>

      {xp && <XpStrip xp={xp} />}

      <AppSearch apps={searchApps} />

      {favorites.length > 0 && (
        <section className="mb-8">
          <h3 className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-amber-400/90">
            <span aria-hidden>★</span> Favorites
          </h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {favorites.map((app) => (
              <AppTile key={app.id} app={app} starred />
            ))}
          </div>
        </section>
      )}

      {CATEGORIES.map((cat) => {
        const apps = gridApps.filter((a) => a.category === cat.id);
        if (apps.length === 0) return null;
        return (
          <section key={cat.id} className="mb-8">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">{cat.label}</h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {apps.map((app) => (
                <AppTile key={app.id} app={app} starred={favoriteIds.has(app.id)} />
              ))}
            </div>
          </section>
        );
      })}

      {admin && <AdminSection />}
    </Shell>
  );
}

/**
 * Admins-only section. Surfaces system tools (feedback review queue, notification
 * prefs, data-health audit) separately from the productivity apps so they're
 * never mistaken for broken/empty data apps. Only rendered when isAdmin(email).
 */
function AdminSection() {
  const adminApps = APPS.filter((a) => ADMIN_APP_IDS.has(a.id));
  return (
    <section className="mb-8 rounded-2xl border border-amber-500/25 bg-amber-500/[0.03] p-4">
      <h3 className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-400/90">
        <span aria-hidden>🛡</span> Administrator
      </h3>
      <p className="mb-3 text-xs text-zinc-500">System tools — visible to admins only.</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <AdminTile
          href="/app/feedback"
          icon="✦"
          name="Feedback Review"
          description="Approve submissions → GitHub"
        />
        <AdminTile
          href="/app/admin/health"
          icon="✓"
          name="Data Health"
          description="Seed / audit app data"
        />
        {adminApps.map((app) => (
          <AdminTile
            key={app.id}
            href={`/app/${app.id}`}
            icon={app.icon}
            name={app.name}
            description={app.description}
          />
        ))}
      </div>
    </section>
  );
}

function AdminTile({
  href,
  icon,
  name,
  description,
}: {
  href: string;
  icon: string;
  name: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col rounded-2xl border border-amber-500/20 bg-zinc-900/50 p-4 transition active:scale-[0.98] hover:border-amber-500/40 hover:bg-zinc-900"
    >
      <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-xl text-amber-400 ring-1 ring-amber-500/20">
        {icon}
      </div>
      <div className="text-sm font-semibold text-zinc-100">{name}</div>
      <div className="text-xs text-zinc-500 line-clamp-1">{description}</div>
    </Link>
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

function AppTile({ app, starred }: { app: (typeof APPS)[number]; starred: boolean }) {
  // The star is a SIBLING of the Link (a <button> can't live inside an <a>);
  // the relative wrapper anchors its absolute position over the tile.
  return (
    <div className="relative">
      <Link
        href={`/app/${app.id}`}
        className="group flex flex-col rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4 pr-10 transition active:scale-[0.98] hover:border-zinc-700 hover:bg-zinc-900"
      >
        <div
          className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl text-xl"
          style={categoryIconStyle(app.category)}
        >
          {app.icon}
        </div>
        <div className="text-sm font-semibold text-zinc-100">{app.name}</div>
        <div className="text-xs text-zinc-500 line-clamp-1">{app.description}</div>
      </Link>
      <StarButton appId={app.id} initial={starred} />
    </div>
  );
}
