import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createServerSupabase: vi.fn() }));

import { saveFocusSessionAction, deleteFocusEntryAction } from "@/app/app/focus/actions";
import { createServerSupabase } from "@/lib/supabase/server";

function makeQuery() {
  const q: Record<string, unknown> = {};
  for (const m of ["select", "insert", "update", "delete", "eq", "order", "limit"]) {
    q[m] = vi.fn(() => q);
  }
  q.then = (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) =>
    Promise.resolve({ data: null, error: null }).then(resolve, reject);
  return q;
}

function makeClient(user: unknown, query = makeQuery()) {
  return {
    auth: { getUser: vi.fn(async () => ({ data: { user }, error: null })) },
    from: vi.fn(() => query),
    __query: query,
  };
}

const asMock = (fn: unknown) => fn as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("saveFocusSessionAction", () => {
  it("ignores zero or negative durations", async () => {
    const client = makeClient({ id: "u1" });
    asMock(createServerSupabase).mockResolvedValue(client);
    await saveFocusSessionAction(0, "intent", []);
    await saveFocusSessionAction(-5, "intent", []);
    expect(client.from).not.toHaveBeenCalled();
  });

  it("rounds minutes and stores intent + distractions joined", async () => {
    const client = makeClient({ id: "u1" });
    asMock(createServerSupabase).mockResolvedValue(client);
    await saveFocusSessionAction(44.6, "  Write the report  ", [" phone ", "", "slack"]);
    expect(client.from).toHaveBeenCalledWith("daily_trackers");
    expect(client.__query.insert).toHaveBeenCalledWith({
      user_id: "u1",
      tracker_type: "focus",
      value: 45,
      label: "Write the report",
      note: "phone | slack",
    });
  });

  it("nulls out an empty intent and an empty distraction list", async () => {
    const client = makeClient({ id: "u1" });
    asMock(createServerSupabase).mockResolvedValue(client);
    await saveFocusSessionAction(25, "   ", []);
    expect(client.__query.insert).toHaveBeenCalledWith({
      user_id: "u1",
      tracker_type: "focus",
      value: 25,
      label: null,
      note: null,
    });
  });
});

describe("deleteFocusEntryAction", () => {
  it("scopes delete by user_id and tracker_type", async () => {
    const client = makeClient({ id: "u1" });
    asMock(createServerSupabase).mockResolvedValue(client);
    await deleteFocusEntryAction(99);
    expect(client.from).toHaveBeenCalledWith("daily_trackers");
    expect(client.__query.delete).toHaveBeenCalled();
    expect(client.__query.eq).toHaveBeenCalledWith("id", 99);
    expect(client.__query.eq).toHaveBeenCalledWith("user_id", "u1");
    expect(client.__query.eq).toHaveBeenCalledWith("tracker_type", "focus");
  });
});
