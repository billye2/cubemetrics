"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabase } from "@/lib/supabase/server";
import { cleanScore, cleanStatus, cleanWeight } from "./lib";

async function requireUser() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return { supabase, userId: user.id };
}

const PATH = "/app/decisionmatrix";

type Supa = Awaited<ReturnType<typeof requireUser>>["supabase"];

/** Verify a decision belongs to the caller before touching its children. */
async function ownsDecision(supabase: Supa, userId: string, decisionId: number): Promise<boolean> {
  const { data } = await supabase
    .from("decisions")
    .select("id")
    .eq("id", decisionId)
    .eq("user_id", userId)
    .maybeSingle();
  return Boolean(data);
}

// --- Decisions ---------------------------------------------------------------

export async function addDecision(question: string): Promise<number | null> {
  const q = question.trim();
  if (!q) return null;
  const { supabase, userId } = await requireUser();
  const { data } = await supabase
    .from("decisions")
    .insert({ user_id: userId, question: q.slice(0, 300) })
    .select("id")
    .maybeSingle();
  revalidatePath(PATH);
  return (data?.id as number) ?? null;
}

export async function setQuestion(id: number, question: string) {
  const q = question.trim();
  if (!q) return;
  const { supabase, userId } = await requireUser();
  await supabase
    .from("decisions")
    .update({ question: q.slice(0, 300) })
    .eq("id", id)
    .eq("user_id", userId);
  revalidatePath(PATH);
}

export async function deleteDecision(id: number) {
  const { supabase, userId } = await requireUser();
  // options / criteria / scores cascade via FK on delete.
  await supabase.from("decisions").delete().eq("id", id).eq("user_id", userId);
  revalidatePath(PATH);
}

/** P2 — record the option actually chosen (may differ from the computed winner). */
export async function recordDecision(
  decisionId: number,
  chosenOptionId: number | null,
  rationale: string,
  revisitAt: string | null,
) {
  const { supabase, userId } = await requireUser();
  if (!(await ownsDecision(supabase, userId, decisionId))) return;

  // Guard: a chosen option must belong to this decision.
  let chosen: number | null = null;
  if (chosenOptionId != null) {
    const { data } = await supabase
      .from("decision_options")
      .select("id")
      .eq("id", chosenOptionId)
      .eq("decision_id", decisionId)
      .eq("user_id", userId)
      .maybeSingle();
    if (data) chosen = chosenOptionId;
  }

  await supabase
    .from("decisions")
    .update({
      chosen_option_id: chosen,
      rationale: rationale.trim().slice(0, 2000),
      revisit_at: revisitAt || null,
      status: chosen != null ? "decided" : "open",
    })
    .eq("id", decisionId)
    .eq("user_id", userId);
  revalidatePath(PATH);
}

/** P3 — revisit outcome rating once the revisit date has passed. */
export async function recordOutcome(decisionId: number, outcome: string) {
  const { supabase, userId } = await requireUser();
  await supabase
    .from("decisions")
    .update({ outcome: outcome.trim().slice(0, 200), status: "revisit" })
    .eq("id", decisionId)
    .eq("user_id", userId);
  revalidatePath(PATH);
}

// --- Options -----------------------------------------------------------------

export async function addOption(decisionId: number, label: string) {
  const l = label.trim();
  if (!l) return;
  const { supabase, userId } = await requireUser();
  if (!(await ownsDecision(supabase, userId, decisionId))) return;
  const { count } = await supabase
    .from("decision_options")
    .select("id", { count: "exact", head: true })
    .eq("decision_id", decisionId)
    .eq("user_id", userId);
  await supabase.from("decision_options").insert({
    user_id: userId,
    decision_id: decisionId,
    label: l.slice(0, 120),
    sort_order: count ?? 0,
  });
  revalidatePath(PATH);
}

export async function setOptionLabel(id: number, label: string) {
  const l = label.trim();
  if (!l) return;
  const { supabase, userId } = await requireUser();
  await supabase
    .from("decision_options")
    .update({ label: l.slice(0, 120) })
    .eq("id", id)
    .eq("user_id", userId);
  revalidatePath(PATH);
}

export async function deleteOption(id: number) {
  const { supabase, userId } = await requireUser();
  await supabase.from("decision_options").delete().eq("id", id).eq("user_id", userId);
  revalidatePath(PATH);
}

// --- Criteria ----------------------------------------------------------------

export async function addCriterion(decisionId: number, label: string, weight: number) {
  const l = label.trim();
  if (!l) return;
  const { supabase, userId } = await requireUser();
  if (!(await ownsDecision(supabase, userId, decisionId))) return;
  const { count } = await supabase
    .from("decision_criteria")
    .select("id", { count: "exact", head: true })
    .eq("decision_id", decisionId)
    .eq("user_id", userId);
  await supabase.from("decision_criteria").insert({
    user_id: userId,
    decision_id: decisionId,
    label: l.slice(0, 120),
    weight: cleanWeight(weight),
    sort_order: count ?? 0,
  });
  revalidatePath(PATH);
}

export async function setCriterionLabel(id: number, label: string) {
  const l = label.trim();
  if (!l) return;
  const { supabase, userId } = await requireUser();
  await supabase
    .from("decision_criteria")
    .update({ label: l.slice(0, 120) })
    .eq("id", id)
    .eq("user_id", userId);
  revalidatePath(PATH);
}

export async function setCriterionWeight(id: number, weight: number) {
  const { supabase, userId } = await requireUser();
  await supabase
    .from("decision_criteria")
    .update({ weight: cleanWeight(weight) })
    .eq("id", id)
    .eq("user_id", userId);
  revalidatePath(PATH);
}

export async function deleteCriterion(id: number) {
  const { supabase, userId } = await requireUser();
  await supabase.from("decision_criteria").delete().eq("id", id).eq("user_id", userId);
  revalidatePath(PATH);
}

// --- Scores ------------------------------------------------------------------

/** Upsert a single option × criterion cell. */
export async function setScore(
  decisionId: number,
  optionId: number,
  criterionId: number,
  score: number,
) {
  const { supabase, userId } = await requireUser();
  if (!(await ownsDecision(supabase, userId, decisionId))) return;
  await supabase
    .from("decision_scores")
    .upsert(
      {
        user_id: userId,
        decision_id: decisionId,
        option_id: optionId,
        criterion_id: criterionId,
        score: cleanScore(score),
      },
      { onConflict: "option_id,criterion_id" },
    );
  revalidatePath(PATH);
}

// --- Duplicate (P3) ----------------------------------------------------------

/** Duplicate a decision's question + options + criteria as a fresh template. */
export async function duplicateDecision(sourceId: number): Promise<number | null> {
  const { supabase, userId } = await requireUser();
  const { data: src } = await supabase
    .from("decisions")
    .select("question")
    .eq("id", sourceId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!src) return null;

  const { data: created } = await supabase
    .from("decisions")
    .insert({ user_id: userId, question: `${(src.question as string).slice(0, 280)} (copy)` })
    .select("id")
    .maybeSingle();
  const newId = created?.id as number | undefined;
  if (!newId) return null;

  const { data: opts } = await supabase
    .from("decision_options")
    .select("label, sort_order")
    .eq("decision_id", sourceId)
    .eq("user_id", userId);
  if (opts && opts.length > 0) {
    await supabase.from("decision_options").insert(
      opts.map((o) => ({
        user_id: userId,
        decision_id: newId,
        label: o.label as string,
        sort_order: (o.sort_order as number) ?? 0,
      })),
    );
  }

  const { data: crits } = await supabase
    .from("decision_criteria")
    .select("label, weight, sort_order")
    .eq("decision_id", sourceId)
    .eq("user_id", userId);
  if (crits && crits.length > 0) {
    await supabase.from("decision_criteria").insert(
      crits.map((c) => ({
        user_id: userId,
        decision_id: newId,
        label: c.label as string,
        weight: cleanWeight(c.weight),
        sort_order: (c.sort_order as number) ?? 0,
      })),
    );
  }

  revalidatePath(PATH);
  return newId;
}

// Re-export so the page can normalise without importing lib twice in actions.
export { cleanStatus };
