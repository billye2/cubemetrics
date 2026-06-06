import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { getApp } from "@/lib/modern/catalog";
import type { createServerSupabase } from "@/lib/supabase/server";

type Supabase = Awaited<ReturnType<typeof createServerSupabase>>;

/**
 * Capability A — the +XP assistant's LIVE layout tools. Unlike the entry tools
 * (propose→confirm), these reshape /today immediately because they're trivially
 * reversible (just order/visibility on `today_prefs`) and the whole point is to see
 * Today change. Every change is undoable via "revert to automatic" (clearTodayPrefs).
 */
export const LAYOUT_TOOLS: Anthropic.Tool[] = [
  {
    name: "set_today_focus",
    description:
      "Set the user's stated focus for Today (the one thing that matters most right now), shown as a line on the Today page. Pass empty text to clear it.",
    input_schema: {
      type: "object",
      properties: { text: { type: "string", description: "The focus line, e.g. 'fitness and bills'" } },
      required: ["text"],
    },
  },
  {
    name: "set_today_layout",
    description:
      "Set exactly which apps appear on Today, in order. Use Today-eligible app ids from the list. Replaces the automatic selection until reset.",
    input_schema: {
      type: "object",
      properties: {
        appIds: { type: "array", items: { type: "string" }, description: "Ordered Today-eligible app ids" },
      },
      required: ["appIds"],
    },
  },
  {
    name: "hide_today_app",
    description: "Hide one app from Today (e.g. 'hide journaling'). Use a Today-eligible app id.",
    input_schema: {
      type: "object",
      properties: { appId: { type: "string", description: "App id to hide" } },
      required: ["appId"],
    },
  },
  {
    name: "show_today_app",
    description: "Un-hide an app previously hidden from Today.",
    input_schema: {
      type: "object",
      properties: { appId: { type: "string", description: "App id to show again" } },
      required: ["appId"],
    },
  },
  {
    name: "reset_today_layout",
    description: "Revert Today to the automatic layout — clears the focus, custom order, and hidden apps.",
    input_schema: { type: "object", properties: {}, required: [] },
  },
];

export const LAYOUT_TOOL_NAMES = new Set(LAYOUT_TOOLS.map((t) => t.name));

type Prefs = { focus: string | null; ordered_app_ids: string[]; hidden_app_ids: string[] };

async function getPrefs(supabase: Supabase, userId: string): Promise<Prefs> {
  const { data } = await supabase
    .from("today_prefs")
    .select("focus, ordered_app_ids, hidden_app_ids")
    .eq("user_id", userId)
    .maybeSingle();
  return {
    focus: data?.focus ?? null,
    ordered_app_ids: data?.ordered_app_ids ?? [],
    hidden_app_ids: data?.hidden_app_ids ?? [],
  };
}

async function savePrefs(supabase: Supabase, userId: string, p: Prefs): Promise<boolean> {
  const { error } = await supabase.from("today_prefs").upsert(
    { user_id: userId, ...p, updated_by: "agent", updated_at: new Date().toISOString() },
    { onConflict: "user_id" },
  );
  return !error;
}

/** Clear the override — "revert to automatic". Exposed for the assistant's revert button. */
export async function clearTodayPrefs(supabase: Supabase, userId: string): Promise<boolean> {
  const { error } = await supabase.from("today_prefs").delete().eq("user_id", userId);
  return !error;
}

const appName = (id: string) => getApp(id)?.name ?? id;

export type LayoutResult = { message: string; change?: { summary: string } };

/** Apply one live layout tool. `eligible` = the Today-eligible (adaptered) app ids. */
export async function applyLayoutTool(
  supabase: Supabase,
  userId: string,
  name: string,
  input: Record<string, unknown>,
  eligible: string[],
): Promise<LayoutResult> {
  const ok = (summary: string): LayoutResult => ({ message: summary, change: { summary } });

  if (name === "set_today_focus") {
    const text = String(input.text ?? "").trim().slice(0, 200);
    const prefs = await getPrefs(supabase, userId);
    if (!(await savePrefs(supabase, userId, { ...prefs, focus: text || null })))
      return { message: "Couldn't update your Today focus." };
    return ok(text ? `Focus set: ${text}` : "Cleared your Today focus");
  }

  if (name === "set_today_layout") {
    const reg = new Set(eligible);
    const raw = Array.isArray(input.appIds) ? (input.appIds as unknown[]).map(String) : [];
    const seen = new Set<string>();
    const valid = raw.filter((id) => reg.has(id) && !seen.has(id) && seen.add(id));
    if (valid.length === 0) return { message: "None of those are apps that can appear on Today." };
    const prefs = await getPrefs(supabase, userId);
    if (!(await savePrefs(supabase, userId, { ...prefs, ordered_app_ids: valid })))
      return { message: "Couldn't update your Today layout." };
    return ok(`Today now shows: ${valid.map(appName).join(", ")}`);
  }

  if (name === "hide_today_app") {
    const appId = String(input.appId ?? "");
    if (!eligible.includes(appId)) return { message: `"${appId}" isn't an app on Today.` };
    const prefs = await getPrefs(supabase, userId);
    if (prefs.hidden_app_ids.includes(appId)) return { message: `${appName(appId)} is already hidden.` };
    const hidden = [...prefs.hidden_app_ids, appId];
    if (!(await savePrefs(supabase, userId, { ...prefs, hidden_app_ids: hidden })))
      return { message: "Couldn't hide that app." };
    return ok(`Hid ${appName(appId)} from Today`);
  }

  if (name === "show_today_app") {
    const appId = String(input.appId ?? "");
    const prefs = await getPrefs(supabase, userId);
    if (!prefs.hidden_app_ids.includes(appId)) return { message: `${appName(appId)} isn't hidden.` };
    const hidden = prefs.hidden_app_ids.filter((id) => id !== appId);
    if (!(await savePrefs(supabase, userId, { ...prefs, hidden_app_ids: hidden })))
      return { message: "Couldn't show that app." };
    return ok(`Showing ${appName(appId)} on Today again`);
  }

  if (name === "reset_today_layout") {
    if (!(await clearTodayPrefs(supabase, userId))) return { message: "Couldn't reset your Today." };
    return ok("Reverted Today to automatic");
  }

  return { message: `Unknown layout tool: ${name}` };
}
