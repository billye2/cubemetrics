import { describe, it, expect } from "vitest";
import { applyLayoutTool, LAYOUT_TOOL_NAMES, clearTodayPrefs } from "@/lib/agent/layout";

// Chainable Supabase stub: methods return the builder; awaiting resolves to a response
// keyed by `${table}:${op}`. Records upserts/deletes for assertions.
function makeSupabase(plan: Record<string, { data?: unknown; error?: unknown }> = {}) {
  const upserts: Array<{ table: string; value: Record<string, unknown> }> = [];
  const deletes: Array<{ table: string }> = [];
  function from(table: string) {
    let op = "select";
    const b: Record<string, unknown> = {
      upsert(v: Record<string, unknown>) {
        op = "upsert";
        upserts.push({ table, value: v });
        return b;
      },
      delete() {
        op = "delete";
        deletes.push({ table });
        return b;
      },
      select: () => b,
      eq: () => b,
      maybeSingle: () => b,
      then(resolve: (r: { data?: unknown; error?: unknown }) => void) {
        resolve(plan[`${table}:${op}`] ?? plan[table] ?? { data: null, error: null });
      },
    };
    return b;
  }
  return { sb: { from } as never, upserts, deletes };
}

const USER = "user-1";
const ELIGIBLE = ["water", "habits", "journal", "todo"];

describe("LAYOUT_TOOL_NAMES", () => {
  it("covers the five live layout tools", () => {
    expect([...LAYOUT_TOOL_NAMES].sort()).toEqual(
      ["hide_today_app", "reset_today_layout", "set_today_focus", "set_today_layout", "show_today_app"],
    );
  });
});

describe("applyLayoutTool", () => {
  it("set_today_focus upserts the focus with agent provenance", async () => {
    const { sb, upserts } = makeSupabase();
    const out = await applyLayoutTool(sb, USER, "set_today_focus", { text: "fitness and bills" }, ELIGIBLE);
    expect(out.change?.summary).toMatch(/fitness and bills/);
    expect(upserts[0].value).toMatchObject({ user_id: USER, focus: "fitness and bills", updated_by: "agent" });
  });

  it("set_today_layout keeps only eligible ids, deduped", async () => {
    const { sb, upserts } = makeSupabase();
    const out = await applyLayoutTool(
      sb,
      USER,
      "set_today_layout",
      { appIds: ["journal", "ghost", "water", "journal"] },
      ELIGIBLE,
    );
    expect(out.change).toBeDefined();
    expect(upserts[0].value).toMatchObject({ ordered_app_ids: ["journal", "water"] });
  });

  it("set_today_layout with no eligible ids makes no change", async () => {
    const { sb, upserts } = makeSupabase();
    const out = await applyLayoutTool(sb, USER, "set_today_layout", { appIds: ["ghost"] }, ELIGIBLE);
    expect(out.change).toBeUndefined();
    expect(upserts).toHaveLength(0);
  });

  it("hide_today_app appends to the hidden set", async () => {
    const { sb, upserts } = makeSupabase({ "today_prefs:select": { data: { hidden_app_ids: ["todo"] } } });
    const out = await applyLayoutTool(sb, USER, "hide_today_app", { appId: "journal" }, ELIGIBLE);
    expect(out.change?.summary).toMatch(/hid/i);
    expect(upserts[0].value).toMatchObject({ hidden_app_ids: ["todo", "journal"] });
  });

  it("hide_today_app rejects an app that can't be on Today", async () => {
    const { sb, upserts } = makeSupabase();
    const out = await applyLayoutTool(sb, USER, "hide_today_app", { appId: "ghost" }, ELIGIBLE);
    expect(out.change).toBeUndefined();
    expect(upserts).toHaveLength(0);
  });

  it("reset_today_layout deletes the override row", async () => {
    const { sb, deletes } = makeSupabase();
    const out = await applyLayoutTool(sb, USER, "reset_today_layout", {}, ELIGIBLE);
    expect(out.change?.summary).toMatch(/automatic/i);
    expect(deletes[0]).toEqual({ table: "today_prefs" });
  });
});

describe("clearTodayPrefs", () => {
  it("deletes the user's today_prefs row", async () => {
    const { sb, deletes } = makeSupabase();
    expect(await clearTodayPrefs(sb, USER)).toBe(true);
    expect(deletes[0]).toEqual({ table: "today_prefs" });
  });
});
