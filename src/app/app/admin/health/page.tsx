import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { isAdmin } from "@/lib/modern/admin";
import { Shell } from "@/components/modern/Shell";

export const dynamic = "force-dynamic";

/**
 * Admin-only data-health dashboard. Surfaces, per backing table, how many rows
 * the current admin user owns — the web version of `node scripts/audit-apps.mjs`.
 * It's how you confirm the seed/audit state at a glance instead of opening each
 * of the ~80 apps by hand. Counts use the service-role client (RLS-bypassing),
 * so they reflect true storage even if an app's own RLS read were broken.
 */

// Backing tables grouped by the area they power. (app label → table)
const GROUPS: { label: string; rows: { app: string; table: string }[] }[] = [
  {
    label: "Trackers (shared daily_trackers)",
    rows: [{ app: "Water / Sleep / Mood / Steps / …", table: "daily_trackers" }],
  },
  {
    label: "Lists & logs (shared)",
    rows: [
      { app: "Checklists (grocery, packing, …)", table: "checklists" },
      { app: "Logbooks (journal-style)", table: "logs" },
      { app: "Goals (goals, OKR savings, …)", table: "goals" },
      { app: "Finance (bills, income, …)", table: "finance_items" },
      { app: "Schedule (car, meds)", table: "schedule_items" },
    ],
  },
  {
    label: "Custom apps",
    rows: [
      { app: "To-Do / Priority Matrix", table: "todos" },
      { app: "Notes", table: "notes" },
      { app: "Journal", table: "journal_entries" },
      { app: "Reading", table: "reading_list" },
      { app: "Habits", table: "habits" },
      { app: "Counter", table: "counters" },
      { app: "Calendar", table: "calendar_events" },
      { app: "Pomodoro", table: "pomodoro_sessions" },
      { app: "Countdown", table: "countdowns" },
      { app: "Kanban", table: "kanban_cards" },
      { app: "Inbox", table: "inbox_items" },
      { app: "Contacts / Keep in Touch", table: "contacts" },
      { app: "Clients", table: "clients" },
      { app: "Job Tracker", table: "job_applications" },
      { app: "Vocabulary", table: "vocab_words" },
      { app: "Warranty", table: "warranties" },
      { app: "Weekly Review", table: "weekly_reviews" },
      { app: "Vision Board", table: "vision_cards" },
      { app: "Plants", table: "plants" },
      { app: "Projects", table: "projects" },
      { app: "Recipes", table: "recipes" },
      { app: "OKR", table: "objectives" },
      { app: "Skill Tree", table: "skills" },
      { app: "File Index", table: "file_index" },
      { app: "Inventory", table: "inventory_items" },
      { app: "Meal Planner", table: "meal_plan" },
      { app: "Net Worth", table: "net_worth_accounts" },
      { app: "Debt", table: "debts" },
      { app: "Decision Matrix", table: "decisions" },
      { app: "Bookmarks", table: "bookmarks" },
      { app: "Budget", table: "budget_targets" },
      { app: "Expenses", table: "expenses" },
      { app: "Savings", table: "savings_contributions" },
      { app: "Flashcards", table: "flashcards" },
      { app: "Workout", table: "workout_sessions" },
    ],
  },
];

async function countFor(
  sb: ReturnType<typeof createAdminSupabase>,
  table: string,
  userId: string,
): Promise<number | null> {
  // head:true → no rows transferred, just the exact count.
  const { count, error } = await sb
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);
  if (error) return null; // missing table / column → flag as error
  return count ?? 0;
}

export default async function AdminHealthPage() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");
  // Hard gate: only the admin account may view this page.
  if (!(await isAdmin(user.email))) redirect("/apps");

  const sb = createAdminSupabase();
  const groups = await Promise.all(
    GROUPS.map(async (g) => ({
      label: g.label,
      rows: await Promise.all(
        g.rows.map(async (r) => ({ ...r, count: await countFor(sb, r.table, user.id) })),
      ),
    })),
  );

  const all = groups.flatMap((g) => g.rows);
  const errors = all.filter((r) => r.count === null).length;
  const empty = all.filter((r) => r.count === 0).length;
  const healthy = all.filter((r) => (r.count ?? 0) >= 15).length;

  return (
    <Shell back={{ href: "/apps", label: "Apps" }} title="Data Health">
      <p className="mb-4 text-sm text-zinc-400">
        Row counts for your account, per backing table. The web version of{" "}
        <code className="rounded bg-zinc-800 px-1 py-0.5 text-xs">node scripts/audit-apps.mjs</code>.
      </p>

      <div className="mb-6 grid grid-cols-3 gap-2">
        <Stat label="Healthy ≥15" value={String(healthy)} tone="text-emerald-400" />
        <Stat label="Empty" value={String(empty)} tone={empty ? "text-amber-400" : undefined} />
        <Stat label="Errors" value={String(errors)} tone={errors ? "text-rose-400" : undefined} />
      </div>

      {groups.map((g) => (
        <section key={g.label} className="mb-6">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
            {g.label}
          </h3>
          <div className="overflow-hidden rounded-xl border border-zinc-800">
            {g.rows.map((r, i) => (
              <div
                key={r.table}
                className={`flex items-center gap-3 px-3 py-2.5 ${
                  i > 0 ? "border-t border-zinc-800/60" : ""
                }`}
              >
                <Dot count={r.count} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm text-zinc-100">{r.app}</div>
                  <div className="truncate text-[11px] text-zinc-500">{r.table}</div>
                </div>
                <div
                  className={`shrink-0 text-sm font-semibold tabular-nums ${
                    r.count === null
                      ? "text-rose-400"
                      : r.count === 0
                        ? "text-amber-400"
                        : "text-zinc-200"
                  }`}
                >
                  {r.count === null ? "ERR" : r.count}
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}

      <p className="text-xs text-zinc-600">
        ERR = the table/column is missing in the database (schema drift) — that app would render
        blank. Empty = no rows yet. Re-run <code className="text-zinc-500">audit-apps.mjs</code> for
        the full static scan of every app&apos;s queries.
      </p>
    </Shell>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 px-3 py-3 text-center">
      <div className={`text-base font-semibold tabular-nums ${tone ?? "text-zinc-100"}`}>
        {value}
      </div>
      <div className="mt-0.5 text-[10px] font-medium uppercase tracking-wider text-zinc-500">
        {label}
      </div>
    </div>
  );
}

function Dot({ count }: { count: number | null }) {
  const color =
    count === null ? "bg-rose-500" : count === 0 ? "bg-amber-500" : "bg-emerald-500";
  return <span className={`h-2 w-2 shrink-0 rounded-full ${color}`} aria-hidden />;
}
