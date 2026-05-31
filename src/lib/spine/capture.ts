"use server";
import { revalidatePath } from "next/cache";
import { getSpineCtx } from "./ctx";
import { ADAPTERS } from "./_generated";
import { classify, loggableApps } from "./registry";
import { isCaptureTable } from "./lib";
import type { CaptureResponse, SpineCtx } from "./types";

// Below this confidence, don't auto-route — show the picker instead.
const CONFIDENT = 0.5;

/** Auto-route free text to the best loggable app. */
export async function capture(input: string): Promise<CaptureResponse> {
  const text = input.trim();
  if (!text) return { result: null, candidates: loggableApps() };
  const ctx = await getSpineCtx();
  if (!ctx) return { result: null, candidates: [] };

  const ranked = classify(text);
  const top = ranked[0];
  if (!top || top.score < CONFIDENT) return { result: null, candidates: loggableApps() };
  return runQuickLog(ctx, top.appId, text);
}

/** Force-route to a user-picked app (bypasses match). */
export async function captureTo(appId: string, input: string): Promise<CaptureResponse> {
  const ctx = await getSpineCtx();
  if (!ctx) return { result: null, candidates: [] };
  return runQuickLog(ctx, appId, input.trim());
}

async function runQuickLog(ctx: SpineCtx, appId: string, text: string): Promise<CaptureResponse> {
  const adapter = ADAPTERS.find((a) => a.appId === appId && a.quickLog);
  if (!adapter?.quickLog) return { result: null, candidates: loggableApps() };
  const result = await adapter.quickLog(ctx, text);
  if (result.ok) {
    await ctx.supabase.rpc("bump_app_usage", { p_app: appId }); // capture = usage
    revalidatePath(`/app/${appId}`);
    revalidatePath("/today"); // the future anchor surface (Phase 3)
  }
  return { result, candidates: loggableApps() };
}

/** Reverse the last capture. The token round-trips via the client, so the table
 *  is allowlisted and the delete is user-scoped (RLS double-enforces). */
export async function undoCapture(token: { table: string; id: number }): Promise<{ ok: boolean }> {
  const ctx = await getSpineCtx();
  if (!ctx) return { ok: false };
  if (!isCaptureTable(token.table)) return { ok: false }; // hard allowlist
  await ctx.supabase.from(token.table).delete().eq("id", token.id).eq("user_id", ctx.userId);
  revalidatePath("/today");
  return { ok: true };
}
