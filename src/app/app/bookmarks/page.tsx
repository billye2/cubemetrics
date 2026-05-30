import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { Shell } from "@/components/modern/Shell";
import { BookmarksView } from "./BookmarksView";
import { toBookmark, type BookmarkRow } from "./lib";

export const dynamic = "force-dynamic";

export default async function BookmarksPage() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data } = await supabase
    .from("bookmarks")
    .select("id, url, title, tags, folder, favicon_url, last_opened_at, unread, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(500);

  const bookmarks = (data as BookmarkRow[] | null ?? []).map(toBookmark);

  return (
    <Shell back={{ href: "/", label: "Apps" }} title="Bookmarks">
      <BookmarksView bookmarks={bookmarks} />
    </Shell>
  );
}
