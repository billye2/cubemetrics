"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabase } from "@/lib/supabase/server";

async function requireUser() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return { supabase, userId: user.id };
}

const PATH = "/app/jobtracker";
export const STAGES = ["saved", "applied", "interview", "offer", "rejected"] as const;
type Stage = (typeof STAGES)[number];

function cleanStage(stage: string): Stage {
  return (STAGES as readonly string[]).includes(stage) ? (stage as Stage) : "saved";
}

export async function addApplication(company: string, role: string) {
  const c = company.trim();
  if (!c) return;
  const { supabase, userId } = await requireUser();
  await supabase.from("job_applications").insert({
    user_id: userId,
    company: c.slice(0, 120),
    role: role.trim().slice(0, 120),
  });
  revalidatePath(PATH);
}

export async function setStage(id: number, stage: string) {
  const next = cleanStage(stage);
  const { supabase, userId } = await requireUser();

  // Stamp the applied date the first time it advances past "saved".
  const update: { stage: Stage; applied_on?: string } = { stage: next };
  if (next !== "saved") {
    const { data } = await supabase
      .from("job_applications")
      .select("applied_on")
      .eq("id", id)
      .eq("user_id", userId)
      .single();
    if (data && !data.applied_on) {
      update.applied_on = new Date().toISOString().split("T")[0];
    }
  }

  await supabase
    .from("job_applications")
    .update(update)
    .eq("id", id)
    .eq("user_id", userId);
  revalidatePath(PATH);
}

export async function deleteApplication(id: number) {
  const { supabase, userId } = await requireUser();
  await supabase.from("job_applications").delete().eq("id", id).eq("user_id", userId);
  revalidatePath(PATH);
}
