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
