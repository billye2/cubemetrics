// Shared presentational primitives for the factory views, so every template app
// speaks the same visual language as the Countdown / Meditation redesigns.
// (factoryLib.ts stays pure logic; React bits live here.)

type Tone = "cyan" | "amber" | "emerald" | "rose" | "zinc";

const TONE_TEXT: Record<Tone, string> = {
  cyan: "text-cyan-400",
  amber: "text-amber-300",
  emerald: "text-emerald-400",
  rose: "text-rose-400",
  zinc: "text-zinc-100",
};

const RING_STROKE: Record<Tone, string> = {
  cyan: "var(--color-cyan-500)",
  amber: "#fbbf24",
  emerald: "#34d399",
  rose: "#fb7185",
  zinc: "var(--color-zinc-500)",
};

/** Progress ring (0..1) with centered content — the Countdown/Meditation hero dial. */
export function Ring({
  pct,
  size = 64,
  stroke = 7,
  tone = "cyan",
  children,
}: {
  pct: number;
  size?: number;
  stroke?: number;
  tone?: Tone;
  children?: React.ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(1, pct));
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-zinc-800)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={RING_STROKE[tone]}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${c * v} ${c}`}
          className="transition-all duration-500 motion-reduce:transition-none"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  );
}

/** One stat cell — bold value + small uppercase label (+ optional sub). */
export function StatTile({
  label,
  value,
  sub,
  tone = "cyan",
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: Tone;
}) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-3 text-center">
      <div className={`text-xl font-bold tracking-tight ${TONE_TEXT[tone]}`}>{value}</div>
      <div className="mt-0.5 text-[10px] uppercase tracking-wider text-zinc-500">
        {sub ? `${label} · ${sub}` : label}
      </div>
    </div>
  );
}

/** 2- or 3-column strip of StatTiles. */
export function StatStrip({ children, cols = 3 }: { children: React.ReactNode; cols?: 2 | 3 }) {
  return (
    <div className={`mb-4 grid gap-3 ${cols === 2 ? "grid-cols-2" : "grid-cols-3"}`}>{children}</div>
  );
}

/** A time-bucket section: header label + count badge, wrapping a list of rows.
 *  `danger` colors the header red (for "Overdue" / "Due now"). Countdown-style. */
export function BucketSection({
  label,
  count,
  danger = false,
  children,
}: {
  label: string;
  count: number;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-5">
      <div className="mb-2 flex items-center gap-2 px-0.5">
        <span className={`text-[12.5px] font-bold ${danger ? "text-rose-400" : "text-zinc-200"}`}>
          {label}
        </span>
        <span className="rounded-full bg-zinc-800 px-1.5 py-0.5 text-[11px] font-bold text-zinc-400">
          {count}
        </span>
      </div>
      <ul className="space-y-2">{children}</ul>
    </div>
  );
}
