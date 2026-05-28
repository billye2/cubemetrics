import Link from "next/link";
import { notFound } from "next/navigation";
import { Shell, Card } from "@/components/modern/Shell";
import { getApp } from "@/lib/modern/catalog";

export const dynamic = "force-dynamic";

export default async function ClassicFallback({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const app = getApp(id);
  if (!app) notFound();

  return (
    <Shell back={{ href: "/", label: "Apps" }} title={app.name}>
      <Card className="p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-cyan-500/10 text-2xl text-cyan-400 ring-1 ring-cyan-500/20">
            {app.icon}
          </div>
          <div>
            <h2 className="text-xl font-semibold tracking-tight">{app.name}</h2>
            <p className="mt-1 text-sm text-zinc-400">{app.description}</p>
          </div>
        </div>

        <div className="mt-6 rounded-xl border border-zinc-800 bg-zinc-950/50 p-4">
          <p className="text-sm text-zinc-300">
            <span className="font-semibold">Coming soon to the modern UI.</span>
          </p>
          <p className="mt-1 text-sm text-zinc-400">
            For now, you can use this app in the classic terminal interface.
          </p>
        </div>

        <Link
          href={`/classic?door=${app.id}`}
          className="mt-5 inline-flex h-11 items-center justify-center rounded-xl bg-cyan-500 px-5 text-sm font-semibold text-zinc-950 hover:bg-cyan-400 active:scale-[0.98]"
        >
          Open in Classic →
        </Link>
      </Card>
    </Shell>
  );
}
