"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabase } from "@/lib/supabase/server";

const PATH = "/app/skilltree";

async function requireUser() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return { supabase, userId: user.id };
}

export async function addSkillAction(name: string, category: string) {
  const n = name.trim();
  if (!n) return;
  const { supabase, userId } = await requireUser();
  await supabase.from("skills").insert({
    user_id: userId,
    name: n,
    category: category.trim() || "General",
  });
  revalidatePath(PATH);
}

export async function editSkillAction(id: number, name: string, category: string) {
  const n = name.trim();
  if (!n) return;
  const { supabase, userId } = await requireUser();
  await supabase
    .from("skills")
    .update({ name: n, category: category.trim() || "General" })
    .eq("id", id)
    .eq("user_id", userId);
  revalidatePath(PATH);
}

export async function deleteSkillAction(id: number) {
  const { supabase, userId } = await requireUser();
  // Practice rows and dependency edges cascade via FK ON DELETE CASCADE.
  await supabase.from("skills").delete().eq("id", id).eq("user_id", userId);
  revalidatePath(PATH);
}

/**
 * Log a practice session: append a history row and bump the skill's running XP
 * total. The level is derived from xp in the page, so we only persist the total.
 */
export async function logPracticeAction(
  skillId: number,
  xp: number,
  minutes: number | null,
  note: string,
) {
  const amount = Math.floor(xp);
  if (!Number.isFinite(amount) || amount <= 0) return;
  const { supabase, userId } = await requireUser();

  // Confirm ownership and read the current total in one go.
  const { data: skill } = await supabase
    .from("skills")
    .select("xp")
    .eq("id", skillId)
    .eq("user_id", userId)
    .single();
  if (!skill) return;

  const mins = minutes != null && Number.isFinite(minutes) && minutes > 0 ? Math.floor(minutes) : null;

  await supabase.from("skill_practice").insert({
    user_id: userId,
    skill_id: skillId,
    xp: amount,
    minutes: mins,
    note: note.trim(),
  });

  await supabase
    .from("skills")
    .update({ xp: (skill.xp as number) + amount })
    .eq("id", skillId)
    .eq("user_id", userId);

  revalidatePath(PATH);
}

export async function deletePracticeAction(id: number, skillId: number, xp: number) {
  const { supabase, userId } = await requireUser();
  const { data: skill } = await supabase
    .from("skills")
    .select("xp")
    .eq("id", skillId)
    .eq("user_id", userId)
    .single();
  if (!skill) return;

  await supabase.from("skill_practice").delete().eq("id", id).eq("user_id", userId);

  const next = Math.max(0, (skill.xp as number) - Math.floor(xp));
  await supabase
    .from("skills")
    .update({ xp: next })
    .eq("id", skillId)
    .eq("user_id", userId);

  revalidatePath(PATH);
}

export async function addDepAction(
  skillId: number,
  requiresSkillId: number,
  minLevel: number,
) {
  if (skillId === requiresSkillId) return;
  const lvl = Math.max(1, Math.floor(minLevel) || 1);
  const { supabase, userId } = await requireUser();

  // Guard against an immediate cycle: don't let A require B if B already requires A.
  const { data: reverse } = await supabase
    .from("skill_deps")
    .select("id")
    .eq("user_id", userId)
    .eq("skill_id", requiresSkillId)
    .eq("requires_skill_id", skillId)
    .maybeSingle();
  if (reverse) return;

  await supabase.from("skill_deps").insert({
    user_id: userId,
    skill_id: skillId,
    requires_skill_id: requiresSkillId,
    min_level: lvl,
  });
  revalidatePath(PATH);
}

export async function deleteDepAction(id: number) {
  const { supabase, userId } = await requireUser();
  await supabase.from("skill_deps").delete().eq("id", id).eq("user_id", userId);
  revalidatePath(PATH);
}
