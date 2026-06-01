import Link from "next/link";
import { Card } from "@/components/modern/Shell";
import { TodayCard } from "./TodayCard";
import type { Mode, TodayGroups } from "@/lib/spine/today-view";
import type { SpineToday } from "@/lib/spine/types";

const MODES: { id: Mode; label: string }[] = [
  { id: "morning", label: "Morning" },
  { id: "day", label: "Day" },
  { id: "evening", label: "Evening" },
];

function Section({ title, cards }: { title: string; cards: SpineToday[] }) {
  if (cards.length === 0) return null;
  return (
    <section className="mb-6">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">{title}</h3>
      <div className="space-y-3">
        {cards.map((c) => (
          <TodayCard key={c.appId} card={c} />
        ))}
      </div>
    </section>
  );
}

export function TodayBody({ mode, groups }: { mode: Mode; groups: TodayGroups }) {
  const empty = groups.attention.length + groups.upcoming.length + groups.done.length === 0;
  // Evening leads with the payoff (what's done); otherwise lead with what needs doing.
  const order: [string, SpineToday[]][] =
    mode === "evening"
      ? [
          ["Done today", groups.done],
          ["Needs attention", groups.attention],
          ["Upcoming", groups.upcoming],
        ]
      : [
          ["Needs attention", groups.attention],
          ["Upcoming", groups.upcoming],
          ["Done today", groups.done],
        ];

  return (
    <div>
      <div className="mb-5 flex gap-1.5">
        {MODES.map((m) => (
          <Link
            key={m.id}
            href={`/today?m=${m.id}`}
            scroll={false}
            className={`rounded-lg px-3 py-1 text-xs font-medium ${
              mode === m.id ? "bg-cyan-500/15 text-cyan-300" : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {m.label}
          </Link>
        ))}
      </div>

      {empty ? (
        <Card className="p-6 text-center">
          <p className="text-sm text-zinc-300">Your day is a blank slate.</p>
          <p className="mt-1 text-sm text-zinc-500">Open an app to get rolling.</p>
        </Card>
      ) : (
        order.map(([title, cards]) => <Section key={title} title={title} cards={cards} />)
      )}
    </div>
  );
}
