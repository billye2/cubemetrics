"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabase } from "@/lib/supabase/server";

async function ctx(appId: string) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return { supabase, userId: user.id, path: `/app/${appId}` };
}

// === Tracker ===
export async function trackerAddAction(
  appId: string,
  trackerType: string,
  value: number,
  note: string,
) {
  const { supabase, userId, path } = await ctx(appId);
  await supabase.from("daily_trackers").insert({
    user_id: userId,
    tracker_type: trackerType,
    value,
    note: note || null,
  });
  revalidatePath(path);
}

export async function trackerDeleteAction(appId: string, id: number) {
  const { supabase, userId, path } = await ctx(appId);
  await supabase.from("daily_trackers").delete().eq("id", id).eq("user_id", userId);
  revalidatePath(path);
}

// === Checklist ===
export async function checklistAddAction(appId: string, listType: string, title: string) {
  if (!title.trim()) return;
  const { supabase, userId, path } = await ctx(appId);
  await supabase.from("checklists").insert({ user_id: userId, list_type: listType, title: title.trim() });
  revalidatePath(path);
}

export async function checklistToggleAction(appId: string, id: number, completed: boolean) {
  const { supabase, userId, path } = await ctx(appId);
  await supabase.from("checklists").update({ completed }).eq("id", id).eq("user_id", userId);
  revalidatePath(path);
}

export async function checklistDeleteAction(appId: string, id: number) {
  const { supabase, userId, path } = await ctx(appId);
  await supabase.from("checklists").delete().eq("id", id).eq("user_id", userId);
  revalidatePath(path);
}

// === Logbook ===
export async function logbookAddAction(
  appId: string,
  logType: string,
  title: string,
  body: string,
) {
  if (!body.trim()) return;
  const { supabase, userId, path } = await ctx(appId);
  await supabase.from("logs").insert({
    user_id: userId,
    log_type: logType,
    title: title.trim() || null,
    body: body.trim(),
  });
  revalidatePath(path);
}

export async function logbookDeleteAction(appId: string, id: number) {
  const { supabase, userId, path } = await ctx(appId);
  await supabase.from("logs").delete().eq("id", id).eq("user_id", userId);
  revalidatePath(path);
}

// === Goal ===
export async function goalAddAction(
  appId: string,
  goalType: string,
  title: string,
  target: number | null,
) {
  if (!title.trim()) return;
  const { supabase, userId, path } = await ctx(appId);
  const payload: Record<string, unknown> = {
    user_id: userId,
    goal_type: goalType,
    title: title.trim(),
  };
  if (target !== null) payload.target_value = target;
  await supabase.from("goals").insert(payload);
  revalidatePath(path);
}

export async function goalUpdateProgressAction(appId: string, id: number, current: number) {
  const { supabase, userId, path } = await ctx(appId);
  await supabase.from("goals").update({ current_value: current }).eq("id", id).eq("user_id", userId);
  revalidatePath(path);
}

export async function goalCompleteAction(appId: string, id: number) {
  const { supabase, userId, path } = await ctx(appId);
  await supabase.from("goals").update({ status: "completed" }).eq("id", id).eq("user_id", userId);
  revalidatePath(path);
}

export async function goalDeleteAction(appId: string, id: number) {
  const { supabase, userId, path } = await ctx(appId);
  await supabase.from("goals").delete().eq("id", id).eq("user_id", userId);
  revalidatePath(path);
}

// === Finance ===
export async function financeAddAction(
  appId: string,
  itemType: string,
  name: string,
  amount: number,
  category: string,
  dueDate: string | null,
) {
  if (!name.trim()) return;
  const { supabase, userId, path } = await ctx(appId);
  const payload: Record<string, unknown> = {
    user_id: userId,
    item_type: itemType,
    name: name.trim(),
    amount,
    category: category.trim() || null,
  };
  if (dueDate) payload.due_date = dueDate;
  await supabase.from("finance_items").insert(payload);
  revalidatePath(path);
}

export async function financeTogglePaidAction(appId: string, id: number, paid: boolean) {
  const { supabase, userId, path } = await ctx(appId);
  await supabase.from("finance_items").update({ paid }).eq("id", id).eq("user_id", userId);
  revalidatePath(path);
}

export async function financeDeleteAction(appId: string, id: number) {
  const { supabase, userId, path } = await ctx(appId);
  await supabase.from("finance_items").delete().eq("id", id).eq("user_id", userId);
  revalidatePath(path);
}
