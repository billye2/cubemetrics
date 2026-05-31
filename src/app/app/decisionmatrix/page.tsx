import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { Shell } from "@/components/modern/Shell";
import { DecisionsView } from "./DecisionsView";
import { cleanStatus, cleanScore, cleanWeight, scoreKey, type Status } from "./lib";

export const dynamic = "force-dynamic";

export interface DecisionData {
  id: number;
  question: string;
  status: Status;
  chosenOptionId: number | null;
  rationale: string;
  revisitAt: string | null;
  outcome: string;
  options: { id: number; label: string }[];
  criteria: { id: number; label: string; weight: number }[];
  scores: Record<string, number>;
}

export default async function DecisionMatrixPage() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: decRows } = await supabase
    .from("decisions")
    .select("id, question, status, chosen_option_id, rationale, revisit_at, outcome, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(200);

  const base = decRows || [];
  const ids = base.map((d) => d.id as number);

  const optionsByDecision: Record<number, { id: number; label: string }[]> = {};
  const criteriaByDecision: Record<number, { id: number; label: string; weight: number }[]> = {};
  const scoresByDecision: Record<number, Record<string, number>> = {};

  if (ids.length > 0) {
    const [{ data: optRows }, { data: critRows }, { data: scoreRows }] = await Promise.all([
      supabase
        .from("decision_options")
        .select("id, decision_id, label, sort_order, created_at")
        .eq("user_id", user.id)
        .in("decision_id", ids)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true })
        .limit(4000),
      supabase
        .from("decision_criteria")
        .select("id, decision_id, label, weight, sort_order, created_at")
        .eq("user_id", user.id)
        .in("decision_id", ids)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true })
        .limit(4000),
      supabase
        .from("decision_scores")
        .select("decision_id, option_id, criterion_id, score")
        .eq("user_id", user.id)
        .in("decision_id", ids)
        .limit(20000),
    ]);

    for (const o of optRows || []) {
      (optionsByDecision[o.decision_id as number] ??= []).push({
        id: o.id as number,
        label: o.label as string,
      });
    }
    for (const c of critRows || []) {
      (criteriaByDecision[c.decision_id as number] ??= []).push({
        id: c.id as number,
        label: c.label as string,
        weight: cleanWeight(c.weight),
      });
    }
    for (const s of scoreRows || []) {
      const map = (scoresByDecision[s.decision_id as number] ??= {});
      map[scoreKey(s.option_id as number, s.criterion_id as number)] = cleanScore(s.score);
    }
  }

  const decisions: DecisionData[] = base.map((d) => ({
    id: d.id as number,
    question: d.question as string,
    status: cleanStatus((d.status as string) ?? "open"),
    chosenOptionId: (d.chosen_option_id as number | null) ?? null,
    rationale: (d.rationale as string) ?? "",
    revisitAt: (d.revisit_at as string | null) ?? null,
    outcome: (d.outcome as string) ?? "",
    options: optionsByDecision[d.id as number] ?? [],
    criteria: criteriaByDecision[d.id as number] ?? [],
    scores: scoresByDecision[d.id as number] ?? {},
  }));

  return (
    <Shell back={{ href: "/apps", label: "Apps" }} title="Decisions">
      <DecisionsView decisions={decisions} />
    </Shell>
  );
}
