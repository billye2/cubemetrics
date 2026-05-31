// NOTE: no `import "server-only"` here — these are pure type/const definitions
// imported by both server code AND the unit-tested pure helpers (lib.ts). The
// runtime server guard lives on ctx.ts / registry.ts / adapters / usage.ts.
// The Supabase reference below is a type-only import (erased at build), so it
// pulls in no server runtime.
import type { createServerSupabase } from "@/lib/supabase/server";

type Supabase = Awaited<ReturnType<typeof createServerSupabase>>;

// ── The App Contract (Spine Layer 0) ────────────────────────────────────────
// An optional per-app adapter exposes an app to shared surfaces (Today, capture,
// digest). Adapters live one-file-per-app under ./adapters and are assembled into
// a generated registry, so parallel build lanes never collide on a shared array.
//
// SHAPE IS FINALIZED — Phases 3-5 (dashboard, digest, AI nudges) depend on it.

export type TodayStatus = "overdue" | "due" | "upcoming" | "done";
export const STATUS_ORDER: Record<TodayStatus, number> = { overdue: 0, due: 1, upcoming: 2, done: 3 };
/** A card returns at most this many items; `count` carries the true total. */
export const ITEM_CAP = 5;

export interface TodayItem {
  id: string;            // app-namespaced + stable, e.g. "todo:42"
  label: string;
  status: TodayStatus;   // drives grouping + sort
  due?: string;          // ISO date/datetime; omit if none
  href?: string;         // item deep link; consumer falls back to the card href
}

export interface SpineToday {
  appId: string;
  severity: TodayStatus; // card-level WORST actionable state — the sort + notify-threshold key
  count: number;         // true total pending / headline metric (>= items.length)
  summary: string;       // one line for card AND digest, e.g. "3 open · 1 overdue"
  items: TodayItem[];    // actionable subset, pre-sorted worst-first, capped at ITEM_CAP
  progress?: { current: number; target: number; unit?: string };  // optional ring/bar
  href?: string;         // card deep link; consumer defaults to `/app/${appId}`
}
// Invariants: items pre-sorted worst-first & capped; count = true total; name/icon
// come from the catalog (getApp(appId)), NOT this payload; SpineToday describes
// STATE, not notify policy (that's Layer 4).

export interface QuickLogResult {
  ok: boolean;
  appId: string;
  message: string;       // human-confirmable, e.g. "Logged 2 glasses"
  href?: string;
  undo?: { table: string; id: number };   // inserted row — Phase 2 capture offers Undo
}

/** Tables a capture may undo. undoCapture() (Phase 2) rejects anything not here. */
export const CAPTURE_TABLES = ["todos", "habit_checkins", "daily_trackers", "journal_entries"] as const;

/** A loggable app surfaced in the capture picker (name/icon from the catalog). */
export interface LoggableApp {
  appId: string;
  name: string;
  icon: string;
}

/** Result of a capture attempt: the log result (null when nothing matched
 *  confidently) plus the loggable apps for the "send elsewhere" / disambiguation picker. */
export interface CaptureResponse {
  result: QuickLogResult | null;
  candidates: LoggableApp[];
}

export interface SpineCtx {
  supabase: Supabase;
  userId: string;
  tz: string;            // resolved IANA zone, "UTC" fallback
  now: Date;
}

export interface SpineAdapter {
  appId: string;
  today(ctx: SpineCtx): Promise<SpineToday | null>;        // null = nothing relevant today
  quickLog?(ctx: SpineCtx, input: string): Promise<QuickLogResult>;
  match?(input: string): number;                           // 0..1 — should this app take the capture?
}
