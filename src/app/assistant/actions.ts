"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabase } from "@/lib/supabase/server";
import {
  runAgentTurn,
  executeProposal,
  undoEntry,
  agentConfigured,
  type ChatMessage,
  type AgentResult,
  type Proposal,
  type AppliedEntry,
  type UndoHandle,
} from "@/lib/agent/run";

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
    };
  }

  const { supabase, userId } = await requireUser();
  const trimmed = messages.slice(-HISTORY_CAP);
  try {
    return await runAgentTurn({ supabase, userId, messages: trimmed });
  } catch {
    return { reply: "Something went wrong reaching the assistant. Try again.", proposals: [] };
  }
}

/** Apply the user-confirmed proposals; returns the applied entries with undo handles. */
export async function applyProposals(proposals: Proposal[]): Promise<AppliedEntry[]> {
  const { supabase, userId } = await requireUser();
  const applied: AppliedEntry[] = [];
  for (const p of proposals.slice(0, 25)) {
    const undo = await executeProposal(supabase, userId, p);
    if (undo) applied.push({ label: p.label, undo });
  }
  if (applied.length) revalidatePath("/today");
  return applied;
}

/** Undo a single applied entry. Returns whether it reverted. */
export async function undoAppliedEntry(undo: UndoHandle): Promise<boolean> {
  const { supabase, userId } = await requireUser();
  const ok = await undoEntry(supabase, userId, undo);
  if (ok) revalidatePath("/today");
  return ok;
}
