import { describe, it, expect } from "vitest";
import { matchByName, runTool } from "@/lib/agent/run";

// A tiny chainable Supabase stub. Every query method returns the builder; awaiting
// it resolves to a response keyed by `${table}:${op}` (falling back to the table, then
// to an empty success). Inserts/updates are recorded so tests can assert the RLS scope.
function makeSupabase(plan: Record<string, { data?: unknown; error?: unknown }> = {}) {
  const inserts: Array<{ table: string; value: Record<string, unknown> }> = [];
  const updates: Array<{ table: string; value: Record<string, unknown> }> = [];
  function from(table: string) {
    let op = "select";
    const b: Record<string, unknown> = {
      insert(v: Record<string, unknown>) {
        op = "insert";
        inserts.push({ table, value: v });
        return b;
      },
      update(v: Record<string, unknown>) {
        op = "update";
        updates.push({ table, value: v });
        return b;
      },
      select: () => b,
      eq: () => b,
      limit: () => b,
      single: () => b,
      then(resolve: (r: { data?: unknown; error?: unknown }) => void) {
        resolve(plan[`${table}:${op}`] ?? plan[table] ?? { data: null, error: null });
      },
    };
    return b;
  }
  return { sb: { from } as never, inserts, updates };
}

const USER = "user-1";

describe("matchByName", () => {
  const rows = [{ name: "Meditate" }, { name: "Floss daily" }, { name: "Read" }];
  it("matches case-insensitively, exact before substring", () => {
    expect(matchByName(rows, "meditate")?.name).toBe("Meditate");
    expect(matchByName(rows, "floss")?.name).toBe("Floss daily");
    expect(matchByName(rows, "READ")?.name).toBe("Read");
  });
  it("returns null on no match or empty query", () => {
    expect(matchByName(rows, "swim")).toBeNull();
    expect(matchByName(rows, "  ")).toBeNull();
  });
});

describe("mark_habit_done", () => {
  it("checks off a habit matched by name when not yet done today", async () => {
    const { sb, inserts } = makeSupabase({
      "habits:select": { data: [{ id: 7, name: "Meditate", active: true }] },
      "habit_checkins:select": { data: [] },
      "habit_checkins:insert": { error: null },
    });
    const entries: string[] = [];
    const out = await runTool(sb, USER, "mark_habit_done", { name: "meditate" }, entries);
    expect(out).toContain("Meditate");
    expect(entries).toHaveLength(1);
    const ins = inserts.find((i) => i.table === "habit_checkins")!;
    expect(ins.value).toMatchObject({ habit_id: 7, user_id: USER });
  });

  it("is idempotent — already-done reports done and writes nothing", async () => {
    const { sb, inserts } = makeSupabase({
      "habits:select": { data: [{ id: 7, name: "Meditate", active: true }] },
      "habit_checkins:select": { data: [{ id: 99 }] },
    });
    const entries: string[] = [];
    const out = await runTool(sb, USER, "mark_habit_done", { name: "meditate" }, entries);
    expect(out).toContain("already done");
    expect(entries).toHaveLength(0);
    expect(inserts.some((i) => i.table === "habit_checkins")).toBe(false);
  });

  it("ignores deactivated habits and reports no match", async () => {
    const { sb } = makeSupabase({
      "habits:select": { data: [{ id: 7, name: "Meditate", active: false }] },
    });
    const out = await runTool(sb, USER, "mark_habit_done", { name: "meditate" }, []);
    expect(out).toMatch(/no habit/i);
  });
});

describe("add_journal_entry / add_note", () => {
  it("writes a journal entry scoped to the user", async () => {
    const { sb, inserts } = makeSupabase();
    const entries: string[] = [];
    await runTool(sb, USER, "add_journal_entry", { body: "Felt good", mood: "calm" }, entries);
    expect(inserts[0]).toMatchObject({
      table: "journal_entries",
      value: { user_id: USER, body: "Felt good", mood: "calm" },
    });
    expect(entries).toHaveLength(1);
  });

  it("rejects an empty note", async () => {
    const { sb, inserts } = makeSupabase();
    const out = await runTool(sb, USER, "add_note", { body: "  " }, []);
    expect(out).toMatch(/need the note/i);
    expect(inserts).toHaveLength(0);
  });
});

describe("adjust_counter", () => {
  it("uses the counter's step by default and logs a delta event", async () => {
    const { sb, inserts, updates } = makeSupabase({
      "counters:select": { data: [{ id: 3, name: "Pushups", value: 10, step: 5 }] },
      "counter_events:insert": { error: null },
    });
    const entries: string[] = [];
    const out = await runTool(sb, USER, "adjust_counter", { name: "pushups" }, entries);
    expect(inserts[0]).toMatchObject({
      table: "counter_events",
      value: { user_id: USER, counter_id: 3, delta: 5 },
    });
    expect(updates[0]).toMatchObject({ table: "counters", value: { value: 15 } });
    expect(out).toContain("now 15");
  });

  it("honors an explicit negative amount", async () => {
    const { sb, inserts, updates } = makeSupabase({
      "counters:select": { data: [{ id: 3, name: "Pushups", value: 10, step: 5 }] },
      "counter_events:insert": { error: null },
    });
    await runTool(sb, USER, "adjust_counter", { name: "pushups", amount: -2 }, []);
    expect(inserts[0].value).toMatchObject({ delta: -2 });
    expect(updates[0].value).toMatchObject({ value: 8 });
  });

  it("reports when no counter matches", async () => {
    const { sb } = makeSupabase({ "counters:select": { data: [{ id: 3, name: "Pushups", value: 0, step: 1 }] } });
    const out = await runTool(sb, USER, "adjust_counter", { name: "squats" }, []);
    expect(out).toMatch(/no counter/i);
  });
});
