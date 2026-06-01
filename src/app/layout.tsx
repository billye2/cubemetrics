import type { Metadata, Viewport } from "next";
import "./globals.css";
import { createServerSupabase } from "@/lib/supabase/server";
import { ThemeController } from "@/components/modern/ThemeController";
import { isThemePref, type ThemePref } from "@/lib/theme";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "XP Boost",
  description: "Your personal productivity hub",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  // Browser chrome follows the OS theme (matches body bg in each mode).
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#1a1918" },
    { media: "(prefers-color-scheme: light)", color: "#fafafa" },
  ],
};

// Runs before first paint (in <head>, blocking) so there's no flash of the wrong
// theme. Reads the cached preference from localStorage ("light"|"dark"|"auto",
// default "auto"), resolves "auto" against the OS, and sets data-theme on <html>.
// globals.css keys light mode off html[data-theme="light"]; dark is the default.
const THEME_INIT = `(function(){try{
  var p = localStorage.getItem('xpb-theme') || 'auto';
  var dark = p === 'dark' || (p !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
}catch(e){}})();`;

async function getServerThemePref(): Promise<ThemePref> {
  try {
    const supabase = await createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return "auto";
    const { data } = await supabase.from("profiles").select("theme").eq("id", user.id).single();
    return isThemePref(data?.theme) ? data.theme : "auto";
  } catch {
    return "auto";
  }
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const serverPref = await getServerThemePref();
  return (
    // Theme is a user choice (Settings → Light/Dark/Auto). The inline script sets
    // data-theme before paint; <ThemeController> reconciles the cross-device
    // (DB) preference and live-follows the OS while in "auto".
    <html lang="en">
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
      </head>
      <body>
        <ThemeController serverPref={serverPref} />
        {children}
      </body>
    </html>
  );
}
