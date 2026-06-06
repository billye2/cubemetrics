import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

// Favorites moved into the Apps page (a "Favorites" section above Time & Focus).
// Kept as a redirect so old links / bookmarks still land in the right place.
export default function FavoritesPage() {
  redirect("/apps");
}
