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

function cleanStep(step: number): number {
  return Number.isFinite(step) && step > 0 ? Math.min(Math.floor(step), 1_000_000) : 1;
}

export async function createCounter(name: string, step: number) {
  const trimmed = name.trim();
  if (!trimmed) return;
  const { supabase, userId } = await requireUser();
  await supabase
    .from("counters")
    .insert({ user_id: userId, name: trimmed.slice(0, 80), step: cleanStep(step) });
  revalidatePath("/app/counter");
}

/** Bump a counter by ±its step, logging the delta as an event for history. */
export async function adjustCounter(counterId: number, sign: number) {
  const { supabase, userId } = await requireUser();
  const { data: counter } = await supabase
    .from("counters")
    .select("value, step")
    .eq("id", counterId)
    .eq("user_id", userId)
    .single();
  if (!counter) return;

  const delta = (sign < 0 ? -1 : 1) * counter.step;
  const newValue = Number(counter.value) + delta;

  await supabase
    .from("counter_events")
    .insert({ user_id: userId, counter_id: counterId, delta });
  await supabase
    .from("counters")
    .update({ value: newValue })
    .eq("id", counterId)
    .eq("user_id", userId);
  revalidatePath("/app/counter");
}

export async function setStep(counterId: number, step: number) {
  const { supabase, userId } = await requireUser();
  await supabase
    .from("counters")
    .update({ step: cleanStep(step) })
    .eq("id", counterId)
    .eq("user_id", userId);
  revalidatePath("/app/counter");
}

export async function renameCounter(counterId: number, name: string) {
  const trimmed = name.trim();
  if (!trimmed) return;
  const { supabase, userId } = await requireUser();
  await supabase
    .from("counters")
    .update({ name: trimmed.slice(0, 80) })
    .eq("id", counterId)
    .eq("user_id", userId);
  revalidatePath("/app/counter");
}

/** Zero the value. Resets aren't logged as events — the event log tracks tally
 *  presses only, so today's-presses and the chart stay honest. */
export async function resetCounter(counterId: number) {
  const { supabase, userId } = await requireUser();
  await supabase
    .from("counters")
    .update({ value: 0 })
    .eq("id", counterId)
    .eq("user_id", userId);
  revalidatePath("/app/counter");
}

export async function deleteCounter(counterId: number) {
  const { supabase, userId } = await requireUser();
  await supabase.from("counters").delete().eq("id", counterId).eq("user_id", userId);
  revalidatePath("/app/counter");
}
