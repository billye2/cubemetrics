import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createServerSupabase: vi.fn() }));

import {
  saveFocusSessionAction,
  updateFocusSessionAction,
  deleteFocusEntryAction,
  type FocusInput,
} from "@/app/app/focus/actions";
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
const input = (over: Partial<FocusInput>): FocusInput => ({
  minutes: 25,
  intent: "Focus",
  tag: "Deep",
  planned: 25,
  win: "Did the thing",
  rating: 4,
  met: true,
  ...over,
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe("saveFocusSessionAction", () => {
  it("ignores zero or negative durations", async () => {
    const client = makeClient({ id: "u1" });
    asMock(createServerSupabase).mockResolvedValue(client);
    await saveFocusSessionAction(input({ minutes: 0 }));
    await saveFocusSessionAction(input({ minutes: -5 }));
    expect(client.from).not.toHaveBeenCalled();
  });

  it("rounds minutes and packs win/rating/tag/planned/met into note JSON", async () => {
    const client = makeClient({ id: "u1" });
    asMock(createServerSupabase).mockResolvedValue(client);
    await saveFocusSessionAction(
      input({ minutes: 44.6, intent: "  Write the report  ", tag: "Write", planned: 50, win: "  Drafted it all  ", rating: 5, met: true }),
    );
    expect(client.from).toHaveBeenCalledWith("daily_trackers");
    expect(client.__query.insert).toHaveBeenCalledWith({
      user_id: "u1",
      tracker_type: "focus",
      value: 45,
      label: "Write the report",
      note: JSON.stringify({ win: "Drafted it all", rating: 5, tag: "Write", planned: 50, met: true }),
    });
  });

  it("nulls an empty intent, defaults a blank reflection + out-of-range rating", async () => {
    const client = makeClient({ id: "u1" });
    asMock(createServerSupabase).mockResolvedValue(client);
    await saveFocusSessionAction(input({ minutes: 25, intent: "   ", tag: "Deep", planned: 25, win: "   ", rating: 0, met: "partly" }));
    expect(client.__query.insert).toHaveBeenCalledWith({
      user_id: "u1",
      tracker_type: "focus",
      value: 25,
      label: null,
      note: JSON.stringify({ win: "Showed up and put in the time.", rating: 3, tag: "Deep", planned: 25, met: "partly" }),
    });
  });
});

describe("updateFocusSessionAction", () => {
  it("updates value/label/note scoped to the row + user + type", async () => {
    const client = makeClient({ id: "u1" });
    asMock(createServerSupabase).mockResolvedValue(client);
    await updateFocusSessionAction(7, input({ minutes: 30, intent: "Edited", met: false }));
    expect(client.__query.update).toHaveBeenCalled();
    expect(client.__query.eq).toHaveBeenCalledWith("id", 7);
    expect(client.__query.eq).toHaveBeenCalledWith("user_id", "u1");
    expect(client.__query.eq).toHaveBeenCalledWith("tracker_type", "focus");
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
