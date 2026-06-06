import "server-only";
import { undoEntry, type UndoHandle } from "./run";
import type { createServerSupabase } from "@/lib/supabase/server";

type Supabase = Awaited<ReturnType<typeof createServerSupabase>>;

export interface RecentAction {
  id: number;
  label: string;
  createdAt: string;
}

/** Record an applied agent write in the audit/undo log. Returns the row id (the undo
 *  handle clients use), or null if logging failed (the write still happened). */
export async function logAgentAction(
  supabase: Supabase,
  userId: string,
  action: { tool: string; label: string; undo: UndoHandle },
): Promise<number | null> {
  const { data, error } = await supabase
    .from("agent_actions")
    .insert({ user_id: userId, tool: action.tool, label: action.label, undo: action.undo })
    .select("id")
    .single();
  if (error || !data) return null;
  return data.id;
}

/**
 * Undo a logged action by its id — server-authoritative (the client never holds the raw
 * UndoHandle, so it can't forge a revert target). Looks up the user's row, reverts via the
 * stored handle, then stamps `undone_at` so a repeat is a no-op.
 */
export async function undoActionById(supabase: Supabase, userId: string, id: number): Promise<boolean> {
  const { data } = await supabase
    .from("agent_actions")
    .select("undo, undone_at")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();
  if (!data || data.undone_at) return false; // missing or already undone
  const ok = await undoEntry(supabase, userId, data.undo as UndoHandle);
  if (!ok) return false;
  await supabase
    .from("agent_actions")
    .update({ undone_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", userId);
  return true;
}

/** The user's most recent still-undoable agent writes (newest first) — powers cross-session undo. */
export async function getRecentActions(
  supabase: Supabase,
  userId: string,
  limit = 8,
): Promise<RecentAction[]> {
  const { data } = await supabase
    .from("agent_actions")
    .select("id, label, created_at")
    .eq("user_id", userId)
    .is("undone_at", null)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []).map((r) => ({ id: r.id as number, label: r.label as string, createdAt: r.created_at as string }));
}
