"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabase } from "@/lib/supabase/server";
import {
  runAgentTurn,
  executeProposal,
  agentConfigured,
  type ChatMessage,
  type AgentResult,
  type Proposal,
  type AppliedEntry,
} from "@/lib/agent/run";
import { clearTodayPrefs } from "@/lib/agent/layout";
import { logAgentAction, undoActionById, getRecentActions, type RecentAction } from "@/lib/agent/audit";

const HISTORY_CAP = 16; // keep the prompt small — recent turns only

async function requireUser() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return { supabase, userId: user.id };
}

/** A turn proposes writes (propose→confirm); nothing is saved until applyProposals. */
export async function sendToAssistant(messages: ChatMessage[]): Promise<AgentResult> {
  if (!agentConfigured()) {
    return {
      reply:
        "The +XP assistant isn't configured yet. Set ANTHROPIC_API_KEY in the environment to enable it.",
      proposals: [],
      layoutChanges: [],
    };
  }

  const { supabase, userId } = await requireUser();
  const trimmed = messages.slice(-HISTORY_CAP);
  try {
    const result = await runAgentTurn({ supabase, userId, messages: trimmed });
    // Layout tools apply live → reflect them on Today immediately.
    if (result.layoutChanges.length) revalidatePath("/today");
    return result;
  } catch {
    return { reply: "Something went wrong reaching the assistant. Try again.", proposals: [], layoutChanges: [] };
  }
}

/** Revert Today to its automatic layout (clears the agent/user override). */
export async function resetTodayLayout(): Promise<boolean> {
  const { supabase, userId } = await requireUser();
  const ok = await clearTodayPrefs(supabase, userId);
  if (ok) revalidatePath("/today");
  return ok;
}

/** Apply the user-confirmed proposals; logs each to the audit log and returns the applied
 *  entries with their agent_actions id (the cross-session undo handle). */
export async function applyProposals(proposals: Proposal[]): Promise<AppliedEntry[]> {
  const { supabase, userId } = await requireUser();
  const applied: AppliedEntry[] = [];
  for (const p of proposals.slice(0, 25)) {
    const undo = await executeProposal(supabase, userId, p);
    if (!undo) continue;
    const actionId = await logAgentAction(supabase, userId, { tool: p.tool, label: p.label, undo });
    applied.push({ label: p.label, actionId });
  }
  if (applied.length) revalidatePath("/today");
  return applied;
}

/** Undo a single applied entry by its audit-log id (server-authoritative). */
export async function undoAppliedEntry(actionId: number): Promise<boolean> {
  const { supabase, userId } = await requireUser();
  const ok = await undoActionById(supabase, userId, actionId);
  if (ok) revalidatePath("/today");
  return ok;
}

/** Recent still-undoable agent writes (for cross-session undo in the assistant). */
export async function recentAgentActions(): Promise<RecentAction[]> {
  const { supabase, userId } = await requireUser();
  return getRecentActions(supabase, userId);
}
