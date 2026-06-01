import Link from "next/link";
import { getApp } from "@/lib/modern/catalog";
import type { SpineToday, TodayStatus } from "@/lib/spine/types";

const ICON_ACCENT: Record<TodayStatus, string> = {
  overdue: "text-rose-400",
  due: "text-amber-400",
  upcoming: "text-cyan-400",
  done: "text-emerald-400",
};
const BAR: Record<TodayStatus, string> = {
  overdue: "bg-rose-500",
  due: "bg-amber-500",
  upcoming: "bg-cyan-500",
  done: "bg-emerald-500",
};
const BADGE: Record<TodayStatus, string> = {
  overdue: "bg-rose-500/15 text-rose-300",
  due: "bg-amber-500/15 text-amber-300",
  upcoming: "bg-zinc-700/40 text-zinc-300",
  done: "bg-emerald-500/15 text-emerald-300",
};

/** One Today card per SpineToday. Name/icon come from the catalog (not the payload). */
export function TodayCard({ card }: { card: SpineToday }) {
  const app = getApp(card.appId);
  const href = card.href ?? `/app/${card.appId}`;
  const pct =
    card.progress && card.progress.target > 0
      ? Math.min(100, Math.round((card.progress.current / card.progress.target) * 100))
      : null;

  return (
    <Link
      href={href}
      className="block rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4 transition hover:border-zinc-700 hover:bg-zinc-900 active:scale-[0.99]"
    >
      <div className="flex items-center gap-3">
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cyan-500/10 text-lg ${ICON_ACCENT[card.severity]}`}
        >
          {app?.icon ?? "•"}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <span className="truncate text-sm font-semibold text-zinc-100">{app?.name ?? card.appId}</span>
            <span className="shrink-0 text-xs text-zinc-400">{card.summary}</span>
          </div>
          {pct != null && (
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-zinc-800">
              <div className={`h-full rounded-full ${BAR[card.severity]}`} style={{ width: `${pct}%` }} />
            </div>
          )}
        </div>
      </div>

      {card.items.length > 0 && (
        <ul className="mt-3 space-y-1">
          {card.items.map((it) => (
            <li key={it.id} className="flex items-center justify-between gap-2 text-sm">
              <span className="truncate text-zinc-300">{it.label}</span>
              <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium uppercase ${BADGE[it.status]}`}>
                {it.status}
              </span>
            </li>
          ))}
          {card.count > card.items.length && (
            <li className="text-xs text-zinc-500">+{card.count - card.items.length} more</li>
          )}
        </ul>
      )}
    </Link>
  );
}
