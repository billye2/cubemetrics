"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Chase-style fixed bottom tab bar. Mounted in <Shell> (every logged-in page).
 * Renders on the five tab routes AND inside individual apps (/app/<id>), so the
 * primary nav is always within thumb's reach. Hidden only off those routes
 * (e.g. the logged-out landing page, which doesn't use Shell anyway). Each tab
 * is its own page.
 */

const TAB_ROUTES = new Set(["/today", "/apps", "/assistant", "/app/xp", "/settings"]);

function shouldShow(pathname: string): boolean {
  return TAB_ROUTES.has(pathname) || pathname.startsWith("/app/");
}

export function BottomNav() {
  const pathname = usePathname() ?? "";
  if (!shouldShow(pathname)) return null;

  // Inside an individual app (any /app/<id> except the Progress dashboard
  // /app/xp), highlight Apps — that's where the user came from.
  const inApp = pathname.startsWith("/app/") && pathname !== "/app/xp";

  return (
    <>
      {/* Spacer in normal flow so page content can scroll clear of the fixed bar. */}
      <div aria-hidden className="h-[calc(64px+env(safe-area-inset-bottom))]" />

      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-zinc-800 bg-zinc-950/90 backdrop-blur supports-[backdrop-filter]:bg-zinc-950/75 pb-[env(safe-area-inset-bottom)]"
      >
        <div className="mx-auto flex h-16 max-w-3xl items-stretch justify-around px-1">
          <Tab href="/today" label="Today" active={pathname === "/today"} icon={<IconToday />} />
          <Tab href="/apps" label="Apps" active={pathname === "/apps" || inApp} icon={<IconApps />} />
          <PlusTab href="/assistant" active={pathname === "/assistant"} />
          <Tab href="/app/xp" label="Progress" active={pathname === "/app/xp"} icon={<IconProgress />} />
          <Tab href="/settings" label="Settings" active={pathname === "/settings"} icon={<IconSettings />} />
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

/**
 * The +XP center action — a raised FAB-style tab opening the AI quick-capture
 * assistant (chat/voice → logs entries into the mini-apps). Visually distinct
 * from the flat nav tabs so it reads as the primary "add" action.
 */
function PlusTab({ href, active }: { href: string; active: boolean }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      aria-label="+XP assistant"
      className="flex flex-1 flex-col items-center justify-center gap-1 text-[11px] font-medium transition active:scale-95"
    >
      <span
        className={`-mt-3 flex h-9 w-9 items-center justify-center rounded-full text-zinc-950 shadow-lg ring-4 ring-zinc-950 transition ${
          active ? "bg-cyan-400" : "bg-cyan-500 hover:bg-cyan-400"
        }`}
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </span>
      <span className={active ? "text-cyan-400" : "text-zinc-500"}>+XP</span>
    </Link>
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
