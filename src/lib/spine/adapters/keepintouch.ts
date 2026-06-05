import "server-only";
import { todayKey, addDays } from "@/lib/xp/tz";
import { keepInTouchToday } from "../lib";
import type { SpineAdapter } from "../types";

// Read-only adapter: contacts overdue/due to reach out to (cadence-based).
// next_due = last_contacted + cadence_days; never-contacted = due now; no-cadence skipped.
export const adapter: SpineAdapter = {
  appId: "keepintouch",
  async today(ctx) {
    const today = todayKey(ctx.tz, ctx.now);
    const soon = addDays(today, 7);
    const { data } = await ctx.supabase
      .from("contacts")
      .select("id, name, cadence_days, last_contacted")
      .eq("user_id", ctx.userId);
    const rows = (data ?? []) as {
      id: number;
      name: string;
      cadence_days: number | null;
      last_contacted: string | null;
    }[];
    if (rows.length === 0) return null;
    const result = keepInTouchToday(rows, today, soon);
    return result.count > 0 ? result : null;
  },
};
