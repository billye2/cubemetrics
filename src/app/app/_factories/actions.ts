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
export async function checklistAddAction(
  appId: string,
  listType: string,
  title: string,
  note: string = "",
) {
  if (!title.trim()) return;
  const { supabase, userId, path } = await ctx(appId);
  await supabase.from("checklists").insert({
    user_id: userId,
    list_type: listType,
    title: title.trim(),
    note: note.trim() || null,
  });
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
  createdAt: string | null = null,
) {
  if (!body.trim()) return;
  const { supabase, userId, path } = await ctx(appId);
  const payload: Record<string, unknown> = {
    user_id: userId,
    log_type: logType,
    title: title.trim() || null,
    body: body.trim(),
  };
  if (createdAt) {
    const d = new Date(createdAt);
    if (!Number.isNaN(d.getTime())) payload.created_at = d.toISOString();
  }
  await supabase.from("logs").insert(payload);
  revalidatePath(path);
}

export async function logbookUpdateAction(
  appId: string,
  id: number,
  title: string,
  body: string,
) {
  if (!body.trim()) return;
  const { supabase, userId, path } = await ctx(appId);
  await supabase
    .from("logs")
    .update({ title: title.trim() || null, body: body.trim() })
    .eq("id", id)
    .eq("user_id", userId);
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
  unit: string = "",
  dueDate: string | null = null,
  description: string = "",
) {
  if (!title.trim()) return;
  const { supabase, userId, path } = await ctx(appId);
  const payload: Record<string, unknown> = {
    user_id: userId,
    goal_type: goalType,
    title: title.trim(),
  };
  if (target !== null) payload.target_value = target;
  if (unit.trim()) payload.unit = unit.trim();
  if (dueDate) payload.due_date = dueDate;
  if (description.trim()) payload.description = description.trim();
  await supabase.from("goals").insert(payload);
  revalidatePath(path);
}

export async function goalUpdateProgressAction(appId: string, id: number, current: number) {
  const { supabase, userId, path } = await ctx(appId);
  // Record the update in history (for the trend) then set the latest value.
  await supabase.from("goal_progress").insert({ user_id: userId, goal_id: id, value: current });
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
  frequency: string = "monthly",
) {
  if (!name.trim()) return;
  const { supabase, userId, path } = await ctx(appId);
  const payload: Record<string, unknown> = {
    user_id: userId,
    item_type: itemType,
    name: name.trim(),
    amount,
    category: category.trim() || null,
    frequency,
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

// === Schedule / recurring ===
function cleanInterval(days: number): number {
  return Number.isFinite(days) && days > 0 ? Math.min(Math.floor(days), 3650) : 30;
}

export async function scheduleAddAction(
  appId: string,
  scheduleType: string,
  title: string,
  intervalDays: number,
  note: string = "",
) {
  if (!title.trim()) return;
  const { supabase, userId, path } = await ctx(appId);
  await supabase.from("schedule_items").insert({
    user_id: userId,
    schedule_type: scheduleType,
    title: title.trim().slice(0, 200),
    interval_days: cleanInterval(intervalDays),
    note: note.trim() || null,
  });
  revalidatePath(path);
}

/** Mark done today — stamps last_done and thereby reschedules the next due date. */
export async function scheduleDoneAction(appId: string, id: number) {
  const { supabase, userId, path } = await ctx(appId);
  await supabase
    .from("schedule_items")
    .update({ last_done: new Date().toISOString().split("T")[0] })
    .eq("id", id)
    .eq("user_id", userId);
  revalidatePath(path);
}

export async function scheduleSetIntervalAction(appId: string, id: number, intervalDays: number) {
  const { supabase, userId, path } = await ctx(appId);
  await supabase
    .from("schedule_items")
    .update({ interval_days: cleanInterval(intervalDays) })
    .eq("id", id)
    .eq("user_id", userId);
  revalidatePath(path);
}

export async function scheduleDeleteAction(appId: string, id: number) {
  const { supabase, userId, path } = await ctx(appId);
  await supabase.from("schedule_items").delete().eq("id", id).eq("user_id", userId);
  revalidatePath(path);
}
