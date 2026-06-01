import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { Shell } from "@/components/modern/Shell";
import { SignOutButton } from "@/components/modern/SignOutButton";
import { APPS } from "@/lib/modern/catalog";
import { ADMIN_APP_IDS } from "@/lib/modern/admin";
import { getFavoriteIds } from "@/lib/spine/favorites";
import { StarButton } from "@/components/modern/StarButton";
import { categoryIconStyle } from "@/lib/modern/catalog";

export const dynamic = "force-dynamic";

/**
 * Favorites tab — the apps the user has starred (app_usage.pinned). Star toggles
 * live on each tile here too, so a tap removes it from the list (after refresh).
 * Catalog order is preserved; unknown/admin ids are filtered out defensively.
 */
export default async function FavoritesPage() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const favoriteIds = new Set(await getFavoriteIds().catch(() => []));
  const favorites = APPS.filter((a) => favoriteIds.has(a.id) && !ADMIN_APP_IDS.has(a.id));

  return (
    <Shell back={{ href: "/today", label: "Today" }} title="Favorites" right={<SignOutButton />}>
      {favorites.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="mb-3 inline-flex h-14 w-14 items-center justify-center rounded-full bg-zinc-900 text-2xl text-amber-400 ring-1 ring-zinc-800">
            ★
          </div>
          <h3 className="text-lg font-semibold text-zinc-100">No favorites yet</h3>
          <p className="mt-1 max-w-xs text-sm text-zinc-500">
            Tap the ☆ on any app to star it — your favorites land here for one-tap access.
          </p>
          <Link
            href="/apps"
            className="mt-4 rounded-xl border border-cyan-500/40 bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-300 hover:bg-cyan-500/20"
          >
            Browse apps
          </Link>
        </div>
      ) : (
        <>
          <p className="mb-4 text-sm text-zinc-400">
            {favorites.length} starred {favorites.length === 1 ? "app" : "apps"}
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {favorites.map((app) => (
              <div key={app.id} className="relative">
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
                <StarButton appId={app.id} initial />
              </div>
            ))}
          </div>
        </>
      )}
    </Shell>
  );
}
