import Link from "next/link";
import { HeaderFeedback } from "./HeaderFeedback";
import { HeaderStar } from "./HeaderStar";
import { BottomNav } from "./BottomNav";

interface ShellProps {
  title?: string;
  back?: { href: string; label?: string };
  right?: React.ReactNode;
  children: React.ReactNode;
}

export function Shell({ title, back, right, children }: ShellProps) {
  return (
    <div className="min-h-dvh bg-zinc-950 text-zinc-100 pb-[env(safe-area-inset-bottom)]">
      <header className="sticky top-0 z-10 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur supports-[backdrop-filter]:bg-zinc-950/70">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4 pt-[env(safe-area-inset-top)]">
          <div className="flex items-center gap-3 min-w-0">
            {back ? (
              <Link
                href={back.href}
                className="flex h-9 items-center gap-1 rounded-lg px-2 -ml-2 text-cyan-400 hover:bg-zinc-900 active:bg-zinc-800"
              >
                <span aria-hidden>←</span>
                <span className="text-sm font-medium">{back.label ?? "Back"}</span>
              </Link>
            ) : (
              <Link
                href="/"
                className="flex items-center gap-2 text-zinc-100 font-semibold tracking-tight"
              >
                <span className="inline-block h-6 w-6 rounded bg-cyan-500/20 ring-1 ring-cyan-500/40 text-center text-cyan-400 leading-6 text-xs">◧</span>
                <span>XP Boost</span>
              </Link>
            )}
            {title && (
              <h1 className="ml-1 truncate text-base font-semibold text-zinc-100">{title}</h1>
            )}
          </div>
          <div className="flex items-center gap-2">
            <HeaderStar />
            <HeaderFeedback />
            {right}
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-4 sm:py-6">{children}</main>
      {/* Chase-style fixed bottom tab bar — self-hides off the top-level routes. */}
      <BottomNav />
    </div>
  );
}

export function EmptyState({
  icon = "◌",
  title,
  body,
  action,
}: {
  icon?: string;
  title: string;
  body?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-3 inline-flex h-14 w-14 items-center justify-center rounded-full bg-zinc-900 text-2xl text-zinc-500 ring-1 ring-zinc-800">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-zinc-100">{title}</h3>
      {body && <p className="mt-1 max-w-sm text-sm text-zinc-400">{body}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-zinc-800 bg-zinc-900/50 ${className}`}>{children}</div>
  );
}
