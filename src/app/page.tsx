import { readFileSync } from "node:fs";
import { join } from "node:path";
import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// The logged-out marketing landing (Cubemetrics — warm cream paper + m³ cyan).
// A fully self-contained design with its own fonts, palette, and client JS
// (public/landing/landing.{css,js}) — deliberately NOT wrapped in the app Shell.
// The markup lives in ./_landing/body.html; all three files are assembled from
// the design hand-off (Cubemetrics Landing/ zip: xp-kit.css + page <style> → CSS;
// xp-icons.js + 2 inline scripts + xp-anim.js → JS). Sign-in CTAs link to
// /api/auth/login; the logo points at /brand-mark.png. The client JS renders the
// icon set, section mockups, app-grid, and scroll animations.
const LANDING_HTML = readFileSync(join(process.cwd(), "src/app/_landing/body.html"), "utf8");

export default async function Home() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Logged-in home is the Today ritual; the full app grid lives at /apps.
  if (user) redirect("/today");

  return (
    <>
      <link rel="stylesheet" href="/landing/landing.css" />
      <div id="top" dangerouslySetInnerHTML={{ __html: LANDING_HTML }} />
      {/* Renders icons → wires mockups/app-grid → starts scroll animations. */}
      <script src="/landing/landing.js" defer />
    </>
  );
}
