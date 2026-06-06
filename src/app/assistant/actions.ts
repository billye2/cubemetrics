"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabase } from "@/lib/supabase/server";
import { runAgentTurn, agentConfigured, type ChatMessage, type AgentResult } from "@/lib/agent/run";

const HISTORY_CAP = 16; // keep the prompt small — recent turns only

export async function sendToAssistant(messages: ChatMessage[]): Promise<AgentResult> {
  if (!agentConfigured()) {
    return {
      reply:
        "The +XP assistant isn't configured yet. Set ANTHROPIC_API_KEY in the environment to enable it.",
      entries: [],
    };
  }

  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const trimmed = messages.slice(-HISTORY_CAP);
  let result: AgentResult;
  try {
    result = await runAgentTurn({ supabase, userId: user.id, messages: trimmed });
  } catch {
    return { reply: "Something went wrong reaching the assistant. Try again.", entries: [] };
  }

  // New entries may change Today / the app pages.
  if (result.entries.length) revalidatePath("/today");
  return result;
}
