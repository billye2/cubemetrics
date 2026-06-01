"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Chase-style fixed bottom tab bar. Mounted in <Shell> (every logged-in page)
 * but only RENDERS on the top-level section routes below — so it's the primary
 * nav on the hubs and stays out of the way inside an individual app (which keeps
 * its own back button). Each tab is its own page; the raised center "Capture"
 * button isn't a route — it opens the global Quick Capture bar by dispatching
 * `xpb:capture`, which <QuickCapture> listens for.
 */

const TAB_ROUTES = new Set(["/today", "/apps", "/app/xp", "/settings"]);

function isActive(pathname: string, href: string): boolean {
  return pathname === href;
}

export function BottomNav() {
  const pathname = usePathname() ?? "";
  if (!TAB_ROUTES.has(pathname)) return null;

  return (
    <>
      {/* Spacer in normal flow so page content can scroll clear of the fixed bar. */}
      <div aria-hidden className="h-[calc(64px+env(safe-area-inset-bottom))]" />

      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-zinc-800 bg-zinc-950/90 backdrop-blur supports-[backdrop-filter]:bg-zinc-950/75 pb-[env(safe-area-inset-bottom)]"
      >
        <div className="mx-auto flex h-16 max-w-3xl items-stretch justify-around px-2">
          <Tab href="/today" label="Today" active={isActive(pathname, "/today")} icon={<IconToday />} />
          <Tab href="/apps" label="Apps" active={isActive(pathname, "/apps")} icon={<IconApps />} />
          <CaptureTab />
          <Tab href="/app/xp" label="Progress" active={isActive(pathname, "/app/xp")} icon={<IconProgress />} />
          <Tab href="/settings" label="Settings" active={isActive(pathname, "/settings")} icon={<IconSettings />} />
        </div>
      </nav>
    </>
  );
}

function Tab({
  href,
  label,
  active,
  icon,
}: {
  href: string;
  label: string;
  active: boolean;
  icon: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`flex flex-1 flex-col items-center justify-center gap-1 text-[11px] font-medium transition active:scale-95 ${
        active ? "text-cyan-400" : "text-zinc-500 hover:text-zinc-300"
      }`}
    >
      <span className="flex h-6 w-6 items-center justify-center">{icon}</span>
      <span>{label}</span>
    </Link>
  );
}

function CaptureTab() {
  return (
    <button
      type="button"
      aria-label="Quick capture"
      onClick={() => window.dispatchEvent(new CustomEvent("xpb:capture"))}
      className="flex flex-1 flex-col items-center justify-center gap-1 text-[11px] font-medium text-zinc-500"
    >
      <span className="-mt-5 flex h-12 w-12 items-center justify-center rounded-full bg-cyan-500 text-zinc-950 shadow-lg ring-4 ring-zinc-950 transition active:scale-95">
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round">
          <path d="M12 6v12M6 12h12" />
        </svg>
      </span>
      <span className="-mt-1 text-cyan-400">Capture</span>
    </button>
  );
}

// ── icons (stroke = currentColor) ───────────────────────────────────────────
function IconToday() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 11.5 12 4l9 7.5" />
      <path d="M5 10v9.5h14V10" />
    </svg>
  );
}
function IconApps() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.6" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1.6" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.6" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1.6" />
    </svg>
  );
}
function IconProgress() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19V5" />
      <path d="M4 19h16" />
      <path d="M8 19v-5M13 19V9M18 19v-8" />
    </svg>
  );
}
function IconSettings() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3.2" />
      <path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5 5l2.1 2.1M16.9 16.9 19 19M19 5l-2.1 2.1M7.1 16.9 5 19" />
    </svg>
  );
}
