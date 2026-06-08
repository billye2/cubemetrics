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
    await saveFocusSessionAction(0, "intent", "win", 4);
    await saveFocusSessionAction(-5, "intent", "win", 4);
    expect(client.from).not.toHaveBeenCalled();
  });

  it("rounds minutes and packs the reflection + rating + done into note JSON", async () => {
    const client = makeClient({ id: "u1" });
    asMock(createServerSupabase).mockResolvedValue(client);
    await saveFocusSessionAction(44.6, "  Write the report  ", "  Drafted it all  ", 5, "  ship a v1  ");
    expect(client.from).toHaveBeenCalledWith("daily_trackers");
    expect(client.__query.insert).toHaveBeenCalledWith({
      user_id: "u1",
      tracker_type: "focus",
      value: 45,
      label: "Write the report",
      note: JSON.stringify({ win: "Drafted it all", rating: 5, done: "ship a v1" }),
    });
  });

  it("nulls an empty intent, defaults a blank reflection + out-of-range rating, omits empty done", async () => {
    const client = makeClient({ id: "u1" });
    asMock(createServerSupabase).mockResolvedValue(client);
    await saveFocusSessionAction(25, "   ", "   ", 0, "  ");
    expect(client.__query.insert).toHaveBeenCalledWith({
      user_id: "u1",
      tracker_type: "focus",
      value: 25,
      label: null,
      note: JSON.stringify({ win: "Showed up and put in the time.", rating: 3 }),
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
