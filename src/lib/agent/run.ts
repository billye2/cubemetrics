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

const byUi = (ui: string) => APPS.filter((a) => a.ui === ui).map((a) => `${a.id} — ${a.name}`);

function catalogDigest(): string {
  const trackers = APPS.filter((a) => a.ui === "tracker").map(
    (a) => `${a.id} — ${a.name}${a.config?.unit ? ` (${a.config.unit})` : ""}`,
  );
  return [
    "Tracker apps (log_tracker — a numeric value):",
    ...trackers.map((t) => `  • ${t}`),
    "Checklist apps (add_checklist_item):",
    ...byUi("checklist").map((c) => `  • ${c}`),
    "Logbook apps (add_log — a free-text entry):",
    ...byUi("logbook").map((c) => `  • ${c}`),
    "Goal apps (add_goal):",
    ...byUi("goal").map((c) => `  • ${c}`),
    "Finance apps (add_finance_item):",
    ...byUi("finance").map((c) => `  • ${c}`),
    "Schedule apps (add_schedule_item — a recurring task):",
    ...byUi("schedule").map((c) => `  • ${c}`),
  ].join("\n");
}

const SYSTEM = `You are the +XP quick-capture assistant for XP Boost, a personal productivity hub. The user tells you — by text or voice — what they did or want to track, and you log it into the right mini-app by calling tools.

Rules:
- Only record what the user explicitly states. Never invent quantities, items, or activities.
- Choose the best-matching app from the lists below. If nothing fits, say so plainly; do not force a match.
- For a tracker, if the amount is missing or ambiguous, ask one short clarifying question instead of guessing.
- After writing, confirm what you recorded in one short line. Keep replies brief and friendly.

${catalogDigest()}

You can also:
- add a to-do with add_todo.
- mark a habit done for today with mark_habit_done (match the user's habit by name; it's idempotent).
- add a reflection with add_journal_entry, or save a quick reference note with add_note.
- bump a named tally counter with adjust_counter (defaults to its step; pass amount for a specific number).`;

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
  {
    name: "add_log",
    description:
      "Add a free-text entry to a logbook app (wins/brag, interviews, learning log, etc.). Use the app's id from the logbook list.",
    input_schema: {
      type: "object",
      properties: {
        appId: { type: "string", description: "Logbook app id" },
        body: { type: "string", description: "The entry text" },
        title: { type: "string", description: "Optional short title" },
      },
      required: ["appId", "body"],
    },
  },
  {
    name: "add_goal",
    description: "Create a goal in a goal app. Use the app's id from the goal list.",
    input_schema: {
      type: "object",
      properties: {
        appId: { type: "string", description: "Goal app id" },
        title: { type: "string", description: "The goal" },
        target: { type: "number", description: "Optional numeric target" },
        unit: { type: "string", description: "Optional unit for the target" },
        dueDate: { type: "string", description: "Optional deadline, YYYY-MM-DD" },
      },
      required: ["appId", "title"],
    },
  },
  {
    name: "add_finance_item",
    description:
      "Add a finance item (bill, subscription, expense, income) to a finance app. Use the app's id from the finance list.",
    input_schema: {
      type: "object",
      properties: {
        appId: { type: "string", description: "Finance app id" },
        name: { type: "string", description: "Item name" },
        amount: { type: "number", description: "Amount" },
        category: { type: "string", description: "Optional category" },
        dueDate: { type: "string", description: "Optional due date, YYYY-MM-DD" },
      },
      required: ["appId", "name", "amount"],
    },
  },
  {
    name: "add_schedule_item",
    description:
      "Add a recurring task to a schedule app (medication, car care, etc.). Use the app's id from the schedule list.",
    input_schema: {
      type: "object",
      properties: {
        appId: { type: "string", description: "Schedule app id" },
        title: { type: "string", description: "The recurring task" },
        intervalDays: { type: "number", description: "Repeat every N days" },
      },
      required: ["appId", "title", "intervalDays"],
    },
  },
  {
    name: "mark_habit_done",
    description:
      "Mark one of the user's habits as done for today. Match the habit by name (e.g. 'meditate', 'floss'). Idempotent: if it's already checked off today, it stays done.",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string", description: "The habit's name, as the user refers to it" },
      },
      required: ["name"],
    },
  },
  {
    name: "add_journal_entry",
    description: "Add a dated entry to the journal. Use for reflections or diary-style writing.",
    input_schema: {
      type: "object",
      properties: {
        body: { type: "string", description: "The entry text" },
        title: { type: "string", description: "Optional short title" },
        mood: { type: "string", description: "Optional one-word mood" },
      },
      required: ["body"],
    },
  },
  {
    name: "add_note",
    description: "Save a quick note. Use for reference snippets the user wants to keep.",
    input_schema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Optional title" },
        body: { type: "string", description: "The note text" },
      },
      required: ["body"],
    },
  },
  {
    name: "adjust_counter",
    description:
      "Increment (or decrement) one of the user's tally counters. Match the counter by name. Defaults to the counter's own step size; pass amount to add a specific number (negative to subtract).",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string", description: "The counter's name, as the user refers to it" },
        amount: {
          type: "number",
          description: "How much to add (negative to subtract). Omit to use the counter's step.",
        },
      },
      required: ["name"],
    },
  },
];

/** Case-insensitive exact-then-substring match against a named row set. */
export function matchByName<T extends { name: string }>(rows: T[], query: string): T | null {
  const q = query.trim().toLowerCase();
  if (!q) return null;
  return (
    rows.find((r) => r.name.toLowerCase() === q) ??
    rows.find((r) => r.name.toLowerCase().includes(q)) ??
    null
  );
}

/** Execute one tool call against the user's session (RLS-safe). Returns a result string. */
export async function runTool(
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
  if (name === "add_log") {
    const appId = String(input.appId ?? "");
    const body = String(input.body ?? "").trim();
    const title = input.title ? String(input.title).trim() : null;
    const app = getApp(appId);
    if (!app || app.ui !== "logbook") return `No logbook app "${appId}" exists.`;
    if (!body) return "Need the entry text.";
    const logType = app.config?.logType ?? appId;
    const { error } = await supabase
      .from("logs")
      .insert({ user_id: userId, log_type: logType, title, body });
    if (error) return `Couldn't add to ${app.name}.`;
    const label = `Logged an entry in ${app.name}`;
    entries.push(label);
    return label;
  }
  if (name === "add_goal") {
    const appId = String(input.appId ?? "");
    const title = String(input.title ?? "").trim();
    const app = getApp(appId);
    if (!app || app.ui !== "goal") return `No goal app "${appId}" exists.`;
    if (!title) return "Need the goal title.";
    const payload: Record<string, unknown> = {
      user_id: userId,
      goal_type: app.config?.goalType ?? appId,
      title,
    };
    if (Number.isFinite(Number(input.target))) payload.target_value = Number(input.target);
    if (input.unit) payload.unit = String(input.unit).trim();
    if (input.dueDate) payload.due_date = String(input.dueDate);
    const { error } = await supabase.from("goals").insert(payload);
    if (error) return `Couldn't create the goal in ${app.name}.`;
    const label = `Created goal "${title}" in ${app.name}`;
    entries.push(label);
    return label;
  }
  if (name === "add_finance_item") {
    const appId = String(input.appId ?? "");
    const itemName = String(input.name ?? "").trim();
    const amount = Number(input.amount);
    const app = getApp(appId);
    if (!app || app.ui !== "finance") return `No finance app "${appId}" exists.`;
    if (!itemName) return "Need the item name.";
    if (!Number.isFinite(amount)) return "Need a numeric amount.";
    const payload: Record<string, unknown> = {
      user_id: userId,
      item_type: app.config?.itemType ?? appId,
      name: itemName,
      amount,
      frequency: "monthly",
      category: input.category ? String(input.category).trim() : null,
    };
    if (input.dueDate) payload.due_date = String(input.dueDate);
    const { error } = await supabase.from("finance_items").insert(payload);
    if (error) return `Couldn't add to ${app.name}.`;
    const label = `Added ${itemName} ($${amount}) to ${app.name}`;
    entries.push(label);
    return label;
  }
  if (name === "add_schedule_item") {
    const appId = String(input.appId ?? "");
    const title = String(input.title ?? "").trim();
    const intervalDays = Number(input.intervalDays);
    const app = getApp(appId);
    if (!app || app.ui !== "schedule") return `No schedule app "${appId}" exists.`;
    if (!title) return "Need the task title.";
    if (!Number.isFinite(intervalDays) || intervalDays <= 0)
      return "Need how often to repeat, in days.";
    const { error } = await supabase.from("schedule_items").insert({
      user_id: userId,
      schedule_type: app.config?.scheduleType ?? appId,
      title: title.slice(0, 200),
      interval_days: Math.min(Math.floor(intervalDays), 3650),
      note: null,
    });
    if (error) return `Couldn't schedule in ${app.name}.`;
    const label = `Scheduled "${title}" every ${Math.floor(intervalDays)}d in ${app.name}`;
    entries.push(label);
    return label;
  }
  if (name === "mark_habit_done") {
    const query = String(input.name ?? "").trim();
    if (!query) return "Which habit?";
    const { data: habits } = await supabase
      .from("habits")
      .select("id, name, active")
      .eq("user_id", userId);
    const active = (habits ?? []).filter((h) => h.active !== false);
    if (active.length === 0) return "You have no habits set up yet.";
    const habit = matchByName(active, query);
    if (!habit) return `No habit matches "${query}".`;
    const today = new Date().toISOString().split("T")[0];
    const { data: existing } = await supabase
      .from("habit_checkins")
      .select("id")
      .eq("habit_id", habit.id)
      .eq("user_id", userId)
      .eq("checkin_date", today)
      .limit(1);
    if (existing && existing.length > 0) return `"${habit.name}" is already done today.`;
    const { error } = await supabase
      .from("habit_checkins")
      .insert({ habit_id: habit.id, user_id: userId, checkin_date: today });
    if (error) return `Couldn't check off "${habit.name}".`;
    const label = `Marked "${habit.name}" done for today`;
    entries.push(label);
    return label;
  }
  if (name === "add_journal_entry") {
    const body = String(input.body ?? "").trim();
    if (!body) return "Need the entry text.";
    const title = input.title ? String(input.title).trim() : "";
    const mood = input.mood ? String(input.mood).trim() : null;
    const { error } = await supabase
      .from("journal_entries")
      .insert({ user_id: userId, body, title, mood });
    if (error) return "Couldn't add the journal entry.";
    const label = "Added a journal entry";
    entries.push(label);
    return label;
  }
  if (name === "add_note") {
    const title = input.title ? String(input.title).trim() : "";
    const body = input.body ? String(input.body).trim() : "";
    if (!title && !body) return "Need the note text.";
    const { error } = await supabase.from("notes").insert({ user_id: userId, title, body });
    if (error) return "Couldn't save the note.";
    const label = title ? `Saved note: ${title}` : "Saved a note";
    entries.push(label);
    return label;
  }
  if (name === "adjust_counter") {
    const query = String(input.name ?? "").trim();
    if (!query) return "Which counter?";
    const { data: counters } = await supabase
      .from("counters")
      .select("id, name, value, step")
      .eq("user_id", userId);
    if (!counters || counters.length === 0) return "You have no counters yet.";
    const counter = matchByName(counters, query);
    if (!counter) return `No counter matches "${query}".`;
    const raw = Number(input.amount);
    const delta = Number.isFinite(raw) && raw !== 0 ? Math.trunc(raw) : Number(counter.step);
    const newValue = Number(counter.value) + delta;
    const { error } = await supabase
      .from("counter_events")
      .insert({ user_id: userId, counter_id: counter.id, delta });
    if (error) return `Couldn't update "${counter.name}".`;
    await supabase
      .from("counters")
      .update({ value: newValue })
      .eq("id", counter.id)
      .eq("user_id", userId);
    const label = `${delta >= 0 ? "+" : ""}${delta} to "${counter.name}" (now ${newValue})`;
    entries.push(label);
    return label;
  }
  return `Unknown tool: ${name}`;
}

/**
 * One assistant turn: a manual tool-use loop (claude-api docs) over Haiku, with the
 * full set of quick-capture write tools. Runs in the caller's Supabase session, so every
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
