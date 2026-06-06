import { describe, it, expect } from "vitest";
import { logAgentAction, undoActionById, getRecentActions } from "@/lib/agent/audit";

// Chainable Supabase stub: methods return the builder; awaiting resolves a response keyed
// by `${table}:${op}`. Records inserts/updates/deletes for assertions.
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
      is: () => b,
      order: () => b,
      limit: () => b,
      single: () => b,
      maybeSingle: () => b,
      then(resolve: (r: { data?: unknown; error?: unknown }) => void) {
        resolve(plan[`${table}:${op}`] ?? plan[table] ?? { data: null, error: null });
      },
    };
    return b;
  }
  return { sb: { from } as never, inserts, updates, deletes };
}

const USER = "user-1";

describe("logAgentAction", () => {
  it("records the action scoped to the user and returns its id", async () => {
    const { sb, inserts } = makeSupabase({ "agent_actions:insert": { data: { id: 11 } } });
    const id = await logAgentAction(sb, USER, {
      tool: "add_todo",
      label: "Add to-do: milk",
      undo: { kind: "row", table: "todos", id: 5 },
    });
    expect(id).toBe(11);
    expect(inserts[0]).toMatchObject({
      table: "agent_actions",
      value: { user_id: USER, tool: "add_todo", label: "Add to-do: milk", undo: { kind: "row", table: "todos", id: 5 } },
    });
  });

  it("returns null when the insert fails", async () => {
    const { sb } = makeSupabase({ "agent_actions:insert": { error: { message: "no table" } } });
    expect(await logAgentAction(sb, USER, { tool: "x", label: "x", undo: { kind: "row", table: "todos", id: 1 } })).toBeNull();
  });
});

describe("undoActionById", () => {
  it("reverts the stored handle and stamps undone_at", async () => {
    const { sb, deletes, updates } = makeSupabase({
      "agent_actions:select": { data: { undo: { kind: "row", table: "todos", id: 5 }, undone_at: null } },
    });
    const ok = await undoActionById(sb, USER, 11);
    expect(ok).toBe(true);
    expect(deletes.some((d) => d.table === "todos")).toBe(true); // the original write reverted
    expect(updates.some((u) => u.table === "agent_actions" && "undone_at" in u.value)).toBe(true);
  });

  it("is a no-op when the action was already undone", async () => {
    const { sb, deletes } = makeSupabase({
      "agent_actions:select": { data: { undo: { kind: "row", table: "todos", id: 5 }, undone_at: "2026-06-06T00:00:00Z" } },
    });
    expect(await undoActionById(sb, USER, 11)).toBe(false);
    expect(deletes).toHaveLength(0);
  });

  it("returns false when the action isn't found (RLS / wrong id)", async () => {
    const { sb } = makeSupabase({ "agent_actions:select": { data: null } });
    expect(await undoActionById(sb, USER, 999)).toBe(false);
  });
});

describe("getRecentActions", () => {
  it("maps rows to the client shape", async () => {
    const { sb } = makeSupabase({
      "agent_actions:select": {
        data: [
          { id: 2, label: "Log 2 glasses to Water", created_at: "2026-06-06T10:00:00Z" },
          { id: 1, label: "Add to-do: milk", created_at: "2026-06-06T09:00:00Z" },
        ],
      },
    });
    const recent = await getRecentActions(sb, USER);
    expect(recent).toEqual([
      { id: 2, label: "Log 2 glasses to Water", createdAt: "2026-06-06T10:00:00Z" },
      { id: 1, label: "Add to-do: milk", createdAt: "2026-06-06T09:00:00Z" },
    ]);
  });
});
