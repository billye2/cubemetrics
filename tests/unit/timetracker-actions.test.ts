import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createServerSupabase: vi.fn() }));

import { addTimeEntryAction, deleteTimeEntryAction } from "@/app/app/timetracker/actions";
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

describe("addTimeEntryAction", () => {
  it("rejects empty category or non-positive minutes", async () => {
    const client = makeClient({ id: "u1" });
    asMock(createServerSupabase).mockResolvedValue(client);
    await addTimeEntryAction("   ", 30, "");
    await addTimeEntryAction("Work", 0, "");
    await addTimeEntryAction("Work", -1, "");
    expect(client.from).not.toHaveBeenCalled();
  });

  it("rounds minutes and trims category + note", async () => {
    const client = makeClient({ id: "u1" });
    asMock(createServerSupabase).mockResolvedValue(client);
    await addTimeEntryAction("  Meetings  ", 29.6, "  standup  ");
    expect(client.from).toHaveBeenCalledWith("daily_trackers");
    expect(client.__query.insert).toHaveBeenCalledWith({
      user_id: "u1",
      tracker_type: "timetracker",
      value: 30,
      label: "Meetings",
      note: "standup",
    });
  });

  it("stores null note when the note is blank", async () => {
    const client = makeClient({ id: "u1" });
    asMock(createServerSupabase).mockResolvedValue(client);
    await addTimeEntryAction("Email", 15, "   ");
    expect(client.__query.insert).toHaveBeenCalledWith({
      user_id: "u1",
      tracker_type: "timetracker",
      value: 15,
      label: "Email",
      note: null,
    });
  });
});

describe("deleteTimeEntryAction", () => {
  it("scopes delete by user_id and tracker_type", async () => {
    const client = makeClient({ id: "u1" });
    asMock(createServerSupabase).mockResolvedValue(client);
    await deleteTimeEntryAction(42);
    expect(client.from).toHaveBeenCalledWith("daily_trackers");
    expect(client.__query.delete).toHaveBeenCalled();
    expect(client.__query.eq).toHaveBeenCalledWith("id", 42);
    expect(client.__query.eq).toHaveBeenCalledWith("user_id", "u1");
    expect(client.__query.eq).toHaveBeenCalledWith("tracker_type", "timetracker");
  });
});
