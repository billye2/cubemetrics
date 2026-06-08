import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { APPS, getApp } from "@/lib/modern/catalog";
import { REGISTERED_APP_IDS } from "@/lib/spine/registry";
import { LAYOUT_TOOLS, LAYOUT_TOOL_NAMES, applyLayoutTool } from "./layout";
import { clampContent } from "./limits";
import type { createServerSupabase } from "@/lib/supabase/server";

type Supabase = Awaited<ReturnType<typeof createServerSupabase>>;

export type ChatMessage = { role: "user" | "assistant"; content: string };

/** How a confirmed proposal is reverted. Allowlisted + user-scoped at execution. */
export type UndoHandle =
  | { kind: "row"; table: string; id: number }
  | { kind: "counter"; counterId: number; delta: number; eventId: number };

/**
 * A pending write the assistant wants to make. Nothing is written until the user
 * confirms (propose→confirm). `exec` is the execution descriptor; `label` is shown
 * in the confirm checklist and again as the applied chip.
 */
export interface Proposal {
  id: string;
  tool: string;
  label: string;
  exec:
    | { kind: "insert"; table: string; payload: Record<string, unknown> }
    | { kind: "counter"; counterId: number; delta: number };
}

/** One write that was actually applied. `actionId` is its agent_actions row (the undo
 *  handle clients pass back); null if audit logging failed (the write still happened). */
export interface AppliedEntry {
  label: string;
  actionId: number | null;
}

export interface AgentResult {
  reply: string;
  /** Proposed writes awaiting the user's confirmation (nothing written yet). */
  proposals: Proposal[];
  /** Live, reversible /today layout changes already applied this turn (Capability A). */
  layoutChanges: { summary: string }[];
}

/** Tables the assistant is allowed to insert into / undo from — the write boundary. */
const INSERT_TABLES = new Set([
  "daily_trackers",
  "todos",
  "checklists",
  "logs",
  "goals",
  "finance_items",
  "schedule_items",
  "habit_checkins",
  "journal_entries",
  "notes",
]);

/** The +XP assistant only works with a runtime Anthropic key (spec decision #6 alt). */
export function agentConfigured(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

// AGENT_MODEL may be a gateway "provider/model" string; the direct SDK wants a bare id.
const MODEL = (process.env.AGENT_MODEL ?? "claude-haiku-4-5").replace(/^anthropic\//, "");

const MAX_STEPS = 5;

const byUi = (ui: string) =>
  APPS.filter((a) => a.ui === ui && !a.hidden).map((a) => `${a.id} — ${a.name}`);

function catalogDigest(): string {
  const trackers = APPS.filter((a) => a.ui === "tracker" && !a.hidden).map(
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

// Apps eligible to appear on the Today dashboard (those with a spine adapter) — the
// valid ids for the layout tools. Computed once; catalog + registry are static.
const todayEligible = REGISTERED_APP_IDS.map((id) => `${id} — ${getApp(id)?.name ?? id}`);

const SYSTEM = `You are the +XP assistant for Cubemetrics, a personal productivity hub. You do two jobs by calling tools: (1) capture what the user did into the right mini-app, and (2) reshape their Today dashboard around what matters to them.

CAPTURE (propose→confirm): your capture tool calls do NOT write anything directly — they PROPOSE entries the user reviews and confirms before they're saved. Propose freely, but be accurate.

RESHAPE TODAY (applies immediately, reversible): the layout tools change the Today page right away (the user can revert to automatic any time). Use them when the user says what to focus on, what to show/hide, or how to order Today.

Rules:
- Only act on what the user explicitly states. Never invent quantities, items, or activities.
- Choose the best-matching app from the lists below. If nothing fits, say so plainly; do not force a match.
- For a tracker, if the amount is missing or ambiguous, ask one short clarifying question instead of guessing.
- After choosing your tools, tell the user in one short, friendly line what you've done / lined up.

${catalogDigest()}

Capture also supports:
- add a to-do with add_todo.
- mark a habit done for today with mark_habit_done (match the user's habit by name; it's idempotent).
- add a reflection with add_journal_entry, or save a quick reference note with add_note.
- bump a named tally counter with adjust_counter (defaults to its step; pass amount for a specific number).

Reshape Today tools: set_today_focus, set_today_layout, hide_today_app, show_today_app, reset_today_layout. Apps eligible to appear on Today (use these ids for layout tools):
${todayEligible.map((t) => `  • ${t}`).join("\n")}`;

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

type PlanResult = { message: string; proposal?: Omit<Proposal, "id"> };

const insert = (
  tool: string,
  label: string,
  table: string,
  payload: Record<string, unknown>,
): PlanResult => ({
  message: label,
  proposal: { tool, label, exec: { kind: "insert", table, payload } },
});

/**
 * Validate + resolve a tool call into a Proposal — WITHOUT writing. Name-based tools
 * (habits, counters) do their lookups here; the returned `message` is what the model
 * reads back, and `proposal` (when present) is the pending write to confirm.
 */
export async function planTool(
  supabase: Supabase,
  userId: string,
  name: string,
  input: Record<string, unknown>,
): Promise<PlanResult> {
  if (name === "log_tracker") {
    const appId = String(input.appId ?? "");
    const value = Number(input.value);
    const note = input.note ? String(input.note) : null;
    const app = getApp(appId);
    if (!app || app.ui !== "tracker") return { message: `No tracker app "${appId}" exists.` };
    if (!Number.isFinite(value)) return { message: `Need a numeric value for ${app.name}.` };
    const unit = app.config?.unit ? ` ${app.config.unit}` : "";
    return insert("log_tracker", `Log ${value}${unit} to ${app.name}`, "daily_trackers", {
      tracker_type: app.config?.trackerType ?? appId,
      value,
      note,
    });
  }
  if (name === "add_todo") {
    const title = String(input.title ?? "").trim();
    if (!title) return { message: "Need the task text." };
    return insert("add_todo", `Add to-do: ${title}`, "todos", { title });
  }
  if (name === "add_checklist_item") {
    const appId = String(input.appId ?? "");
    const title = String(input.title ?? "").trim();
    const app = getApp(appId);
    if (!app || app.ui !== "checklist") return { message: `No checklist app "${appId}" exists.` };
    if (!title) return { message: "Need the item text." };
    return insert("add_checklist_item", `Add "${title}" to ${app.name}`, "checklists", {
      list_type: app.config?.listType ?? appId,
      title,
    });
  }
  if (name === "add_log") {
    const appId = String(input.appId ?? "");
    const body = String(input.body ?? "").trim();
    const title = input.title ? String(input.title).trim() : null;
    const app = getApp(appId);
    if (!app || app.ui !== "logbook") return { message: `No logbook app "${appId}" exists.` };
    if (!body) return { message: "Need the entry text." };
    return insert("add_log", `Add an entry to ${app.name}`, "logs", {
      log_type: app.config?.logType ?? appId,
      title,
      body,
    });
  }
  if (name === "add_goal") {
    const appId = String(input.appId ?? "");
    const title = String(input.title ?? "").trim();
    const app = getApp(appId);
    if (!app || app.ui !== "goal") return { message: `No goal app "${appId}" exists.` };
    if (!title) return { message: "Need the goal title." };
    const payload: Record<string, unknown> = { goal_type: app.config?.goalType ?? appId, title };
    if (Number.isFinite(Number(input.target))) payload.target_value = Number(input.target);
    if (input.unit) payload.unit = String(input.unit).trim();
    if (input.dueDate) payload.due_date = String(input.dueDate);
    return insert("add_goal", `Create goal "${title}" in ${app.name}`, "goals", payload);
  }
  if (name === "add_finance_item") {
    const appId = String(input.appId ?? "");
    const itemName = String(input.name ?? "").trim();
    const amount = Number(input.amount);
    const app = getApp(appId);
    if (!app || app.ui !== "finance") return { message: `No finance app "${appId}" exists.` };
    if (!itemName) return { message: "Need the item name." };
    if (!Number.isFinite(amount)) return { message: "Need a numeric amount." };
    const payload: Record<string, unknown> = {
      item_type: app.config?.itemType ?? appId,
      name: itemName,
      amount,
      frequency: "monthly",
      category: input.category ? String(input.category).trim() : null,
    };
    if (input.dueDate) payload.due_date = String(input.dueDate);
    return insert("add_finance_item", `Add ${itemName} ($${amount}) to ${app.name}`, "finance_items", payload);
  }
  if (name === "add_schedule_item") {
    const appId = String(input.appId ?? "");
    const title = String(input.title ?? "").trim();
    const intervalDays = Number(input.intervalDays);
    const app = getApp(appId);
    if (!app || app.ui !== "schedule") return { message: `No schedule app "${appId}" exists.` };
    if (!title) return { message: "Need the task title." };
    if (!Number.isFinite(intervalDays) || intervalDays <= 0)
      return { message: "Need how often to repeat, in days." };
    const days = Math.min(Math.floor(intervalDays), 3650);
    return insert(
      "add_schedule_item",
      `Schedule "${title}" every ${days}d in ${app.name}`,
      "schedule_items",
      { schedule_type: app.config?.scheduleType ?? appId, title: title.slice(0, 200), interval_days: days, note: null },
    );
  }
  if (name === "mark_habit_done") {
    const query = String(input.name ?? "").trim();
    if (!query) return { message: "Which habit?" };
    const { data: habits } = await supabase
      .from("habits")
      .select("id, name, active")
      .eq("user_id", userId);
    const active = (habits ?? []).filter((h) => h.active !== false);
    if (active.length === 0) return { message: "You have no habits set up yet." };
    const habit = matchByName(active, query);
    if (!habit) return { message: `No habit matches "${query}".` };
    const today = new Date().toISOString().split("T")[0];
    const { data: existing } = await supabase
      .from("habit_checkins")
      .select("id")
      .eq("habit_id", habit.id)
      .eq("user_id", userId)
      .eq("checkin_date", today)
      .limit(1);
    if (existing && existing.length > 0) return { message: `"${habit.name}" is already done today.` };
    return insert("mark_habit_done", `Mark "${habit.name}" done today`, "habit_checkins", {
      habit_id: habit.id,
      checkin_date: today,
    });
  }
  if (name === "add_journal_entry") {
    const body = String(input.body ?? "").trim();
    if (!body) return { message: "Need the entry text." };
    const title = input.title ? String(input.title).trim() : "";
    const mood = input.mood ? String(input.mood).trim() : null;
    return insert("add_journal_entry", "Add a journal entry", "journal_entries", { body, title, mood });
  }
  if (name === "add_note") {
    const title = input.title ? String(input.title).trim() : "";
    const body = input.body ? String(input.body).trim() : "";
    if (!title && !body) return { message: "Need the note text." };
    return insert("add_note", title ? `Save note: ${title}` : "Save a note", "notes", { title, body });
  }
  if (name === "adjust_counter") {
    const query = String(input.name ?? "").trim();
    if (!query) return { message: "Which counter?" };
    const { data: counters } = await supabase
      .from("counters")
      .select("id, name, value, step")
      .eq("user_id", userId);
    if (!counters || counters.length === 0) return { message: "You have no counters yet." };
    const counter = matchByName(counters, query);
    if (!counter) return { message: `No counter matches "${query}".` };
    const raw = Number(input.amount);
    const delta = Number.isFinite(raw) && raw !== 0 ? Math.trunc(raw) : Number(counter.step);
    const label = `${delta >= 0 ? "+" : ""}${delta} to "${counter.name}"`;
    return {
      message: label,
      proposal: { tool: "adjust_counter", label, exec: { kind: "counter", counterId: counter.id, delta } },
    };
  }
  return { message: `Unknown tool: ${name}` };
}

/**
 * Execute a confirmed proposal against the user's session (RLS-safe). Returns the undo
 * handle, or null on failure. Re-checks the table allowlist defensively (the client sends
 * the proposal back to apply), and re-reads counter state to avoid a stale-value race.
 */
export async function executeProposal(
  supabase: Supabase,
  userId: string,
  proposal: Pick<Proposal, "exec">,
): Promise<UndoHandle | null> {
  const { exec } = proposal;
  if (exec.kind === "insert") {
    if (!INSERT_TABLES.has(exec.table)) return null;
    // habit_checkins must stay idempotent even on apply (re-check today).
    if (exec.table === "habit_checkins") {
      const { data: dup } = await supabase
        .from("habit_checkins")
        .select("id")
        .eq("user_id", userId)
        .eq("habit_id", exec.payload.habit_id)
        .eq("checkin_date", exec.payload.checkin_date)
        .limit(1);
      if (dup && dup.length > 0) return { kind: "row", table: exec.table, id: dup[0].id };
    }
    const { data, error } = await supabase
      .from(exec.table)
      .insert({ ...exec.payload, user_id: userId })
      .select("id")
      .single();
    if (error || !data) return null;
    return { kind: "row", table: exec.table, id: data.id };
  }
  // counter: re-fetch current value, log the delta event, bump value.
  const { data: counter } = await supabase
    .from("counters")
    .select("value")
    .eq("id", exec.counterId)
    .eq("user_id", userId)
    .single();
  if (!counter) return null;
  const { data: ev, error: evErr } = await supabase
    .from("counter_events")
    .insert({ user_id: userId, counter_id: exec.counterId, delta: exec.delta })
    .select("id")
    .single();
  if (evErr || !ev) return null;
  await supabase
    .from("counters")
    .update({ value: Number(counter.value) + exec.delta })
    .eq("id", exec.counterId)
    .eq("user_id", userId);
  return { kind: "counter", counterId: exec.counterId, delta: exec.delta, eventId: ev.id };
}

/** Revert a previously applied entry (allowlisted table + user-scoped). */
export async function undoEntry(
  supabase: Supabase,
  userId: string,
  undo: UndoHandle,
): Promise<boolean> {
  if (undo.kind === "row") {
    if (!INSERT_TABLES.has(undo.table)) return false;
    const { error } = await supabase.from(undo.table).delete().eq("id", undo.id).eq("user_id", userId);
    return !error;
  }
  // counter: remove the event and subtract the delta back off the value.
  await supabase.from("counter_events").delete().eq("id", undo.eventId).eq("user_id", userId);
  const { data: counter } = await supabase
    .from("counters")
    .select("value")
    .eq("id", undo.counterId)
    .eq("user_id", userId)
    .single();
  if (!counter) return false;
  const { error } = await supabase
    .from("counters")
    .update({ value: Number(counter.value) - undo.delta })
    .eq("id", undo.counterId)
    .eq("user_id", userId);
  return !error;
}

/**
 * One assistant turn: a manual tool-use loop (claude-api docs) over Haiku. Tools run in
 * PLAN mode — they validate + resolve but do not write; the turn returns the proposed
 * writes for the user to confirm (propose→confirm). Runs in the caller's Supabase session,
 * so the later apply is RLS-scoped. No fabrication: the system prompt forbids inventing data.
 */
export async function runAgentTurn(opts: {
  supabase: Supabase;
  userId: string;
  messages: ChatMessage[];
}): Promise<AgentResult> {
  const client = new Anthropic();
  const proposals: Proposal[] = [];
  const layoutChanges: { summary: string }[] = [];
  // Defensive: clamp every message to the per-message cap so an oversized payload
  // (pasted wall of text, runaway transcript) can't inflate token cost, even if the
  // caller skipped the sendToAssistant guard.
  const msgs: Anthropic.MessageParam[] = opts.messages.map((m) => ({
    role: m.role,
    content: clampContent(m.content),
  }));

  for (let step = 0; step < MAX_STEPS; step++) {
    const res = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: SYSTEM,
      tools: [...TOOLS, ...LAYOUT_TOOLS],
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
      const fallback = proposals.length
        ? "Here's what I'll log:"
        : layoutChanges.length
          ? "Done."
          : "Okay.";
      return { reply: text || fallback, proposals, layoutChanges };
    }

    const results: Anthropic.ToolResultBlockParam[] = [];
    for (const tu of toolUses) {
      const input = (tu.input ?? {}) as Record<string, unknown>;
      if (LAYOUT_TOOL_NAMES.has(tu.name)) {
        // Live (Capability A): applies immediately, reversible.
        const out = await applyLayoutTool(opts.supabase, opts.userId, tu.name, input, REGISTERED_APP_IDS);
        if (out.change) layoutChanges.push(out.change);
        results.push({ type: "tool_result", tool_use_id: tu.id, content: out.message });
      } else {
        // Plan (Capability B): proposes, nothing written until confirmed.
        const out = await planTool(opts.supabase, opts.userId, tu.name, input);
        if (out.proposal) proposals.push({ ...out.proposal, id: `p${proposals.length}` });
        results.push({ type: "tool_result", tool_use_id: tu.id, content: out.message });
      }
    }
    msgs.push({ role: "user", content: results });
  }

  return { reply: "That took too many steps — try rephrasing.", proposals, layoutChanges };
}
