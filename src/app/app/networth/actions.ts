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

const PATH = "/app/networth";

function cleanKind(kind: string): "asset" | "liability" {
  return kind === "liability" ? "liability" : "asset";
}

function cleanValue(v: number): number {
  return Number.isFinite(v) ? v : 0;
}

export async function addAccount(name: string, kind: string, value: number) {
  const trimmed = name.trim();
  if (!trimmed) return;
  const { supabase, userId } = await requireUser();
  await supabase.from("net_worth_accounts").insert({
    user_id: userId,
    name: trimmed.slice(0, 120),
    kind: cleanKind(kind),
    value: cleanValue(value),
  });
  revalidatePath(PATH);
}

export async function updateAccountValue(id: number, value: number) {
  const { supabase, userId } = await requireUser();
  await supabase
    .from("net_worth_accounts")
    .update({ value: cleanValue(value) })
    .eq("id", id)
    .eq("user_id", userId);
  revalidatePath(PATH);
}

export async function deleteAccount(id: number) {
  const { supabase, userId } = await requireUser();
  await supabase.from("net_worth_accounts").delete().eq("id", id).eq("user_id", userId);
  revalidatePath(PATH);
}

/** Freeze the current totals into a snapshot for the trend line. */
export async function recordSnapshot() {
  const { supabase, userId } = await requireUser();
  const { data: accounts } = await supabase
    .from("net_worth_accounts")
    .select("kind, value")
    .eq("user_id", userId);

  let assets = 0;
  let liabilities = 0;
  for (const a of accounts || []) {
    if (a.kind === "liability") liabilities += Number(a.value) || 0;
    else assets += Number(a.value) || 0;
  }
  const net = assets - liabilities;

  await supabase
    .from("net_worth_snapshots")
    .insert({ user_id: userId, assets, liabilities, net });
  revalidatePath(PATH);
}
