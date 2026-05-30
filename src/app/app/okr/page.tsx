import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { Shell } from "@/components/modern/Shell";
import { OkrView } from "./OkrView";
import { cleanConfidence, type Confidence } from "./lib";

export const dynamic = "force-dynamic";

export interface KeyResult {
  id: number;
  title: string;
  current_value: number;
  target_value: number;
  sort_order: number;
}

export interface Objective {
  id: number;
  title: string;
  cycle: string;
  confidence: Confidence;
  key_results: KeyResult[];
}

export default async function OkrPage() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: objRows } = await supabase
    .from("objectives")
    .select("id, title, cycle, confidence, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(200);

  const objectivesBase = objRows || [];
  const ids = objectivesBase.map((o) => o.id as number);

  const krsByObjective: Record<number, KeyResult[]> = {};
  if (ids.length > 0) {
    const { data: krRows } = await supabase
      .from("key_results")
      .select("id, objective_id, title, current_value, target_value, sort_order, created_at")
      .eq("user_id", user.id)
      .in("objective_id", ids)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true })
      .limit(2000);
    for (const kr of krRows || []) {
      (krsByObjective[kr.objective_id as number] ??= []).push({
        id: kr.id as number,
        title: kr.title as string,
        current_value: Number(kr.current_value) || 0,
        target_value: Number(kr.target_value) || 0,
        sort_order: (kr.sort_order as number) ?? 0,
      });
    }
  }

  const objectives: Objective[] = objectivesBase.map((o) => ({
    id: o.id as number,
    title: o.title as string,
    cycle: (o.cycle as string) ?? "",
    confidence: cleanConfidence((o.confidence as string) ?? "on_track"),
    key_results: krsByObjective[o.id as number] ?? [],
  }));

  return (
    <Shell back={{ href: "/", label: "Apps" }} title="OKRs">
      <OkrView objectives={objectives} />
    </Shell>
  );
}
