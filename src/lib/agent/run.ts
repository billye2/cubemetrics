import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { APPS, getApp } from "@/lib/modern/catalog";
import type { createServerSupabase } from "@/lib/supabase/server";

type Supabase = Awaited<ReturnType<typeof createServerSupabase>>;

export type ChatMessage = { role: "user" | "assistant"; content: string };
export interface AgentResult {
  reply: string;
  /** Human-readable list of entries actually written this turn. */
  entries: string[];
}

/** The +XP assistant only works with a runtime Anthropic key (spec decision #6 alt). */
export function agentConfigured(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

// AGENT_MODEL may be a gateway "provider/model" string; the direct SDK wants a bare id.
const MODEL = (process.env.AGENT_MODEL ?? "claude-haiku-4-5").replace(/^anthropic\//, "");

const MAX_STEPS = 5;

function catalogDigest(): string {
  const trackers = APPS.filter((a) => a.ui === "tracker").map(
    (a) => `${a.id} — ${a.name}${a.config?.unit ? ` (${a.config.unit})` : ""}`,
  );
  const checklists = APPS.filter((a) => a.ui === "checklist").map((a) => `${a.id} — ${a.name}`);
  return [
    "Tracker apps (log a numeric value via log_tracker):",
    ...trackers.map((t) => `  • ${t}`),
    "Checklist apps (add an item via add_checklist_item):",
    ...checklists.map((c) => `  • ${c}`),
  ].join("\n");
}

const SYSTEM = `You are the +XP quick-capture assistant for XP Boost, a personal productivity hub. The user tells you — by text or voice — what they did or want to track, and you log it into the right mini-app by calling tools.

Rules:
- Only record what the user explicitly states. Never invent quantities, items, or activities.
- Choose the best-matching app from the lists below. If nothing fits, say so plainly; do not force a match.
- For a tracker, if the amount is missing or ambiguous, ask one short clarifying question instead of guessing.
- After writing, confirm what you recorded in one short line. Keep replies brief and friendly.

${catalogDigest()}

You can also add a to-do with add_todo.`;

const TOOLS: Anthropic.Tool[] = [
  {
    name: "log_tracker",
    description:
      "Log a numeric value to a tracker app (water, weight, meditation, steps, mood, etc.). Use the app's id from the tracker list.",
    input_schema: {
      type: "object",
      properties: {
        appId: { type: "string", description: "Tracker app id, e.g. 'water'" },
        value: { type: "number", description: "The numeric value to log" },
        note: { type: "string", description: "Optional short note" },
      },
      required: ["appId", "value"],
    },
  },
  {
    name: "add_todo",
    description: "Add a task to the to-do list.",
    input_schema: {
      type: "object",
      properties: { title: { type: "string", description: "The task text" } },
      required: ["title"],
    },
  },
  {
    name: "add_checklist_item",
    description:
      "Add an item to a checklist app (daily planner, grocery, packing, routines, etc.). Use the app's id from the checklist list.",
    input_schema: {
      type: "object",
      properties: {
        appId: { type: "string", description: "Checklist app id, e.g. 'grocery'" },
        title: { type: "string", description: "The item text" },
      },
      required: ["appId", "title"],
    },
  },
];

/** Execute one tool call against the user's session (RLS-safe). Returns a result string. */
async function runTool(
  supabase: Supabase,
  userId: string,
  name: string,
  input: Record<string, unknown>,
  entries: string[],
): Promise<string> {
  if (name === "log_tracker") {
    const appId = String(input.appId ?? "");
    const value = Number(input.value);
    const note = input.note ? String(input.note) : null;
    const app = getApp(appId);
    if (!app || app.ui !== "tracker") return `No tracker app "${appId}" exists.`;
    if (!Number.isFinite(value)) return `Need a numeric value for ${app.name}.`;
    const trackerType = app.config?.trackerType ?? appId;
    const { error } = await supabase
      .from("daily_trackers")
      .insert({ user_id: userId, tracker_type: trackerType, value, note });
    if (error) return `Couldn't log to ${app.name}.`;
    const unit = app.config?.unit ? ` ${app.config.unit}` : "";
    const label = `Logged ${value}${unit} to ${app.name}`;
    entries.push(label);
    return label;
  }
  if (name === "add_todo") {
    const title = String(input.title ?? "").trim();
    if (!title) return "Need the task text.";
    const { error } = await supabase.from("todos").insert({ user_id: userId, title });
    if (error) return "Couldn't add the to-do.";
    const label = `Added to-do: ${title}`;
    entries.push(label);
    return label;
  }
  if (name === "add_checklist_item") {
    const appId = String(input.appId ?? "");
    const title = String(input.title ?? "").trim();
    const app = getApp(appId);
    if (!app || app.ui !== "checklist") return `No checklist app "${appId}" exists.`;
    if (!title) return "Need the item text.";
    const listType = app.config?.listType ?? appId;
    const { error } = await supabase
      .from("checklists")
      .insert({ user_id: userId, list_type: listType, title });
    if (error) return `Couldn't add to ${app.name}.`;
    const label = `Added "${title}" to ${app.name}`;
    entries.push(label);
    return label;
  }
  return `Unknown tool: ${name}`;
}

/**
 * One assistant turn: a manual tool-use loop (claude-api docs) over Haiku, with the
 * three quick-capture write tools. Runs in the caller's Supabase session, so every
 * write is RLS-scoped to the user. No fabrication: the system prompt forbids inventing data.
 */
export async function runAgentTurn(opts: {
  supabase: Supabase;
  userId: string;
  messages: ChatMessage[];
}): Promise<AgentResult> {
  const client = new Anthropic();
  const entries: string[] = [];
  const msgs: Anthropic.MessageParam[] = opts.messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  for (let step = 0; step < MAX_STEPS; step++) {
    const res = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: SYSTEM,
      tools: TOOLS,
      messages: msgs,
    });
    msgs.push({ role: "assistant", content: res.content });

    const toolUses = res.content.filter(
      (b): b is Anthropic.ToolUseBlock => b.type === "tool_use",
    );
    if (res.stop_reason !== "tool_use" || toolUses.length === 0) {
      const text = res.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("\n")
        .trim();
      return { reply: text || (entries.length ? "Done." : "Okay."), entries };
    }

    const results: Anthropic.ToolResultBlockParam[] = [];
    for (const tu of toolUses) {
      const out = await runTool(
        opts.supabase,
        opts.userId,
        tu.name,
        (tu.input ?? {}) as Record<string, unknown>,
        entries,
      );
      results.push({ type: "tool_result", tool_use_id: tu.id, content: out });
    }
    msgs.push({ role: "user", content: results });
  }

  return { reply: "That took too many steps — try rephrasing.", entries };
}
