import { notFound, redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { Shell, Card } from "@/components/modern/Shell";
import { getApp } from "@/lib/modern/catalog";
import { TrackerView } from "../_factories/TrackerView";
import { ChecklistView } from "../_factories/ChecklistView";
import { LogbookView } from "../_factories/LogbookView";
import { GoalView } from "../_factories/GoalView";
import { FinanceView } from "../_factories/FinanceView";

export const dynamic = "force-dynamic";

export default async function AppDispatch({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const app = getApp(id);
  if (!app) notFound();

  if (app.ui === "modern") {
    // Should be handled by a more specific route — this is a misconfig
    redirect(`/app/${id}`);
  }

  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const config = app.config!;
  const back = { href: "/", label: "Apps" };

  if (app.ui === "tracker") {
    const { data } = await supabase
      .from("daily_trackers")
      .select("id, value, note, created_at")
      .eq("user_id", user.id)
      .eq("tracker_type", config.trackerType!)
      .order("created_at", { ascending: false })
      .limit(60);
    return (
      <Shell back={back} title={app.name}>
        <TrackerView appId={app.id} config={config} entries={data || []} />
      </Shell>
    );
  }

  if (app.ui === "checklist") {
    const { data } = await supabase
      .from("checklists")
      .select("id, title, completed, created_at")
      .eq("user_id", user.id)
      .eq("list_type", config.listType!)
      .order("completed", { ascending: true })
      .order("created_at", { ascending: false })
      .limit(200);
    return (
      <Shell back={back} title={app.name}>
        <ChecklistView appId={app.id} config={config} items={data || []} />
      </Shell>
    );
  }

  if (app.ui === "logbook") {
    const { data } = await supabase
      .from("logs")
      .select("id, title, body, created_at")
      .eq("user_id", user.id)
      .eq("log_type", config.logType!)
      .order("created_at", { ascending: false })
      .limit(100);
    return (
      <Shell back={back} title={app.name}>
        <LogbookView appId={app.id} config={config} entries={data || []} />
      </Shell>
    );
  }

  if (app.ui === "goal") {
    const { data } = await supabase
      .from("goals")
      .select("id, title, current_value, target_value, status, created_at")
      .eq("user_id", user.id)
      .eq("goal_type", config.goalType!)
      .order("status", { ascending: true })
      .order("created_at", { ascending: false })
      .limit(100);
    return (
      <Shell back={back} title={app.name}>
        <GoalView appId={app.id} config={config} goals={data || []} />
      </Shell>
    );
  }

  if (app.ui === "finance") {
    const { data } = await supabase
      .from("finance_items")
      .select("id, name, amount, category, paid, due_date, created_at")
      .eq("user_id", user.id)
      .eq("item_type", config.itemType!)
      .order("paid", { ascending: true })
      .order("due_date", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(100);
    return (
      <Shell back={back} title={app.name}>
        <FinanceView appId={app.id} config={config} items={data || []} />
      </Shell>
    );
  }

  return <ComingSoon app={app} />;
}

function ComingSoon({ app }: { app: NonNullable<ReturnType<typeof getApp>> }) {
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
            This app isn&apos;t available yet — check back soon.
          </p>
        </div>
      </Card>
    </Shell>
  );
}
