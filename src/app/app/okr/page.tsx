import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { Shell } from "@/components/modern/Shell";
import { OkrView } from "./OkrView";
import { cleanConfidence, cleanKrType, type Confidence, type KrType } from "./lib";

export const dynamic = "force-dynamic";

export type ObjectiveStatus = "active" | "graded";

export interface KeyResult {
  id: number;
  title: string;
  kr_type: KrType;
  start_value: number;
  current_value: number;
  target_value: number;
  sort_order: number;
  history: number[];
}

export interface Objective {
  id: number;
  title: string;
  cycle: string;
  confidence: Confidence;
  status: ObjectiveStatus;
  reflection: string;
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
    .select("id, title, cycle, confidence, status, reflection, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(200);

  const objectivesBase = objRows || [];
  const ids = objectivesBase.map((o) => o.id as number);

  const krsByObjective: Record<number, KeyResult[]> = {};
  const krIds: number[] = [];
  if (ids.length > 0) {
    const { data: krRows } = await supabase
      .from("key_results")
      .select(
        "id, objective_id, title, kr_type, start_value, current_value, target_value, sort_order, created_at",
      )
      .eq("user_id", user.id)
      .in("objective_id", ids)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true })
      .limit(2000);
    for (const kr of krRows || []) {
      krIds.push(kr.id as number);
      (krsByObjective[kr.objective_id as number] ??= []).push({
        id: kr.id as number,
        title: kr.title as string,
        kr_type: cleanKrType((kr.kr_type as string) ?? "metric"),
        start_value: Number(kr.start_value) || 0,
        current_value: Number(kr.current_value) || 0,
        target_value: Number(kr.target_value) || 0,
        sort_order: (kr.sort_order as number) ?? 0,
        history: [],
      });
    }
  }

  // P3 history — append-only progress points, attached to their KR in order.
  if (krIds.length > 0) {
    const { data: progRows } = await supabase
      .from("kr_progress")
      .select("key_result_id, value, created_at")
      .eq("user_id", user.id)
      .in("key_result_id", krIds)
      .order("created_at", { ascending: true })
      .limit(5000);
    const byKr: Record<number, number[]> = {};
    for (const p of progRows || []) {
      (byKr[p.key_result_id as number] ??= []).push(Number(p.value) || 0);
    }
    for (const list of Object.values(krsByObjective)) {
      for (const kr of list) kr.history = byKr[kr.id] ?? [];
    }
  }

  const objectives: Objective[] = objectivesBase.map((o) => ({
    id: o.id as number,
    title: o.title as string,
    cycle: (o.cycle as string) ?? "",
    confidence: cleanConfidence((o.confidence as string) ?? "on_track"),
    status: ((o.status as string) === "graded" ? "graded" : "active") as ObjectiveStatus,
    reflection: (o.reflection as string) ?? "",
    key_results: krsByObjective[o.id as number] ?? [],
  }));

  return (
    <Shell back={{ href: "/apps", label: "Apps" }} title="OKRs">
      <OkrView objectives={objectives} />
    </Shell>
  );
}
