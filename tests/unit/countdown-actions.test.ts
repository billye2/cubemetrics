import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createServerSupabase: vi.fn() }));

import { addCountdownAction, deleteCountdownAction } from "@/app/app/countdown/actions";
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

describe("addCountdownAction", () => {
  it("rejects empty title or date", async () => {
    const client = makeClient({ id: "u1" });
    asMock(createServerSupabase).mockResolvedValue(client);
    await addCountdownAction("   ", "2026-06-01", "", "", false, "");
    await addCountdownAction("Birthday", "", "", "", false, "");
    expect(client.from).not.toHaveBeenCalled();
  });

  it("inserts a fully populated countdown", async () => {
    const client = makeClient({ id: "u1" });
    asMock(createServerSupabase).mockResolvedValue(client);
    await addCountdownAction("  Mom's birthday ", "2026-06-12", "09:30", "  Birthday ", true, " buy flowers ");
    expect(client.from).toHaveBeenCalledWith("countdowns");
    expect(client.__query.insert).toHaveBeenCalledWith({
      user_id: "u1",
      title: "Mom's birthday",
      target_date: "2026-06-12",
      target_time: "09:30",
      category: "Birthday",
      recurring_yearly: true,
      note: "buy flowers",
    });
  });

  it("nulls out empty optional fields", async () => {
    const client = makeClient({ id: "u1" });
    asMock(createServerSupabase).mockResolvedValue(client);
    await addCountdownAction("Doctor", "2026-07-15", "", "", false, "");
    expect(client.__query.insert).toHaveBeenCalledWith({
      user_id: "u1",
      title: "Doctor",
      target_date: "2026-07-15",
      target_time: null,
      category: null,
      recurring_yearly: false,
      note: null,
    });
  });
});

describe("deleteCountdownAction", () => {
  it("scopes delete by user_id", async () => {
    const client = makeClient({ id: "u1" });
    asMock(createServerSupabase).mockResolvedValue(client);
    await deleteCountdownAction(7);
    expect(client.from).toHaveBeenCalledWith("countdowns");
    expect(client.__query.delete).toHaveBeenCalled();
    expect(client.__query.eq).toHaveBeenCalledWith("id", 7);
    expect(client.__query.eq).toHaveBeenCalledWith("user_id", "u1");
  });
});
