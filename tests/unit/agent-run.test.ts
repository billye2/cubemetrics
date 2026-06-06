import { describe, it, expect } from "vitest";
import { matchByName, planTool, executeProposal, undoEntry } from "@/lib/agent/run";

// A tiny chainable Supabase stub. Every query method returns the builder; awaiting it
// resolves to a response keyed by `${table}:${op}` (falling back to the table, then to an
// empty success). Inserts/updates/deletes are recorded so tests can assert RLS scope.
function makeSupabase(plan: Record<string, { data?: unknown; error?: unknown }> = {}) {
  const inserts: Array<{ table: string; value: Record<string, unknown> }> = [];
  const updates: Array<{ table: string; value: Record<string, unknown> }> = [];
  const deletes: Array<{ table: string }> = [];
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
      delete() {
        op = "delete";
        deletes.push({ table });
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
  return { sb: { from } as never, inserts, updates, deletes };
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

describe("planTool — proposes without writing", () => {
  it("log_tracker builds an insert proposal and writes nothing", async () => {
    const { sb, inserts } = makeSupabase();
    const out = await planTool(sb, USER, "log_tracker", { appId: "water", value: 2 });
    expect(inserts).toHaveLength(0); // plan mode: no DB writes
    expect(out.proposal?.exec).toMatchObject({ kind: "insert", table: "daily_trackers" });
    expect(out.proposal?.exec).toMatchObject({ payload: { tracker_type: "water", value: 2 } });
  });

  it("rejects an unknown tracker app (no proposal)", async () => {
    const { sb } = makeSupabase();
    const out = await planTool(sb, USER, "log_tracker", { appId: "nope", value: 1 });
    expect(out.proposal).toBeUndefined();
    expect(out.message).toMatch(/no tracker app/i);
  });

  it("mark_habit_done proposes a check-in when not yet done", async () => {
    const { sb, inserts } = makeSupabase({
      "habits:select": { data: [{ id: 7, name: "Meditate", active: true }] },
      "habit_checkins:select": { data: [] },
    });
    const out = await planTool(sb, USER, "mark_habit_done", { name: "meditate" });
    expect(inserts).toHaveLength(0);
    expect(out.proposal?.exec).toMatchObject({ kind: "insert", table: "habit_checkins" });
    expect(out.proposal?.exec).toMatchObject({ payload: { habit_id: 7 } });
  });

  it("mark_habit_done is a no-op proposal when already done", async () => {
    const { sb } = makeSupabase({
      "habits:select": { data: [{ id: 7, name: "Meditate", active: true }] },
      "habit_checkins:select": { data: [{ id: 99 }] },
    });
    const out = await planTool(sb, USER, "mark_habit_done", { name: "meditate" });
    expect(out.proposal).toBeUndefined();
    expect(out.message).toMatch(/already done/i);
  });

  it("adjust_counter proposes a counter delta (default step, explicit amount)", async () => {
    const plan = { "counters:select": { data: [{ id: 3, name: "Pushups", value: 10, step: 5 }] } };
    const dflt = await planTool(makeSupabase(plan).sb, USER, "adjust_counter", { name: "pushups" });
    expect(dflt.proposal?.exec).toMatchObject({ kind: "counter", counterId: 3, delta: 5 });
    const expl = await planTool(makeSupabase(plan).sb, USER, "adjust_counter", { name: "pushups", amount: -2 });
    expect(expl.proposal?.exec).toMatchObject({ kind: "counter", counterId: 3, delta: -2 });
  });
});

describe("executeProposal — applies a confirmed proposal", () => {
  it("inserts an allowlisted row scoped to the user and returns a row undo handle", async () => {
    const { sb, inserts } = makeSupabase({ "journal_entries:insert": { data: { id: 42 } } });
    const undo = await executeProposal(sb, USER, {
      exec: { kind: "insert", table: "journal_entries", payload: { body: "hi" } },
    });
    expect(inserts[0]).toMatchObject({ table: "journal_entries", value: { body: "hi", user_id: USER } });
    expect(undo).toEqual({ kind: "row", table: "journal_entries", id: 42 });
  });

  it("refuses a non-allowlisted table", async () => {
    const { sb, inserts } = makeSupabase({});
    const undo = await executeProposal(sb, USER, {
      exec: { kind: "insert", table: "app_admins", payload: { role: "admin" } },
    });
    expect(undo).toBeNull();
    expect(inserts).toHaveLength(0);
  });

  it("counter: logs an event, bumps the value, returns a counter undo handle", async () => {
    const { sb, inserts, updates } = makeSupabase({
      "counters:select": { data: { value: 10 } },
      "counter_events:insert": { data: { id: 55 } },
    });
    const undo = await executeProposal(sb, USER, { exec: { kind: "counter", counterId: 3, delta: 5 } });
    expect(inserts[0]).toMatchObject({ table: "counter_events", value: { counter_id: 3, delta: 5, user_id: USER } });
    expect(updates[0]).toMatchObject({ table: "counters", value: { value: 15 } });
    expect(undo).toEqual({ kind: "counter", counterId: 3, delta: 5, eventId: 55 });
  });

  it("habit_checkins apply is idempotent (returns the existing row, no new insert)", async () => {
    const { sb, inserts } = makeSupabase({ "habit_checkins:select": { data: [{ id: 88 }] } });
    const undo = await executeProposal(sb, USER, {
      exec: { kind: "insert", table: "habit_checkins", payload: { habit_id: 7, checkin_date: "2026-06-06" } },
    });
    expect(inserts).toHaveLength(0);
    expect(undo).toEqual({ kind: "row", table: "habit_checkins", id: 88 });
  });
});

describe("undoEntry — reverts an applied entry", () => {
  it("deletes the row for an allowlisted table, user-scoped", async () => {
    const { sb, deletes } = makeSupabase();
    const ok = await undoEntry(sb, USER, { kind: "row", table: "todos", id: 5 });
    expect(ok).toBe(true);
    expect(deletes[0]).toEqual({ table: "todos" });
  });

  it("refuses to delete from a non-allowlisted table", async () => {
    const { sb, deletes } = makeSupabase();
    const ok = await undoEntry(sb, USER, { kind: "row", table: "profiles", id: 1 });
    expect(ok).toBe(false);
    expect(deletes).toHaveLength(0);
  });

  it("counter undo removes the event and subtracts the delta back", async () => {
    const { sb, deletes, updates } = makeSupabase({ "counters:select": { data: { value: 15 } } });
    const ok = await undoEntry(sb, USER, { kind: "counter", counterId: 3, delta: 5, eventId: 55 });
    expect(ok).toBe(true);
    expect(deletes.some((d) => d.table === "counter_events")).toBe(true);
    expect(updates[0]).toMatchObject({ table: "counters", value: { value: 10 } });
  });
});
