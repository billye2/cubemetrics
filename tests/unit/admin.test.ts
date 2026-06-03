import { describe, it, expect, vi, beforeEach } from "vitest";

// isAdmin reads the app_admins allowlist through the service-role client.
vi.mock("@/lib/supabase/admin", () => ({ createAdminSupabase: vi.fn() }));

import { isAdmin } from "@/lib/modern/admin";
import { createAdminSupabase } from "@/lib/supabase/admin";

const asMock = (fn: unknown) => fn as ReturnType<typeof vi.fn>;

// Stub the `.from("app_admins").select().eq().maybeSingle()` chain so the
// lookup resolves to `row` (or an error). Returns the query for assertions.
function mockLookup(row: unknown, error: unknown = null) {
  const q: Record<string, unknown> = {};
  q.select = vi.fn(() => q);
  q.eq = vi.fn(() => q);
  q.maybeSingle = vi.fn(async () => ({ data: row, error }));
  asMock(createAdminSupabase).mockReturnValue({ from: vi.fn(() => q) });
  return q;
}

beforeEach(() => vi.clearAllMocks());

describe("isAdmin", () => {
  it("is true when the email is in the app_admins allowlist", async () => {
    mockLookup({ email: "owner@example.com" });
    expect(await isAdmin("owner@example.com")).toBe(true);
  });

  it("lowercases the email before matching (case-insensitive)", async () => {
    const q = mockLookup({ email: "owner@example.com" });
    expect(await isAdmin("OWNER@Example.com")).toBe(true);
    expect(q.eq).toHaveBeenCalledWith("email", "owner@example.com");
  });

  it("is false when the email is not in the allowlist", async () => {
    mockLookup(null);
    expect(await isAdmin("nobody@example.com")).toBe(false);
  });

  it("fail-closed: empty/null/undefined are not admin and never query", async () => {
    expect(await isAdmin("")).toBe(false);
    expect(await isAdmin(null)).toBe(false);
    expect(await isAdmin(undefined)).toBe(false);
    expect(createAdminSupabase).not.toHaveBeenCalled();
  });

  it("fail-closed: a query error is treated as not admin", async () => {
    mockLookup(null, { message: "boom" });
    expect(await isAdmin("owner@example.com")).toBe(false);
  });

  it("fail-closed: a misconfigured/throwing client is not admin", async () => {
    asMock(createAdminSupabase).mockImplementation(() => {
      throw new Error("service role not configured");
    });
    expect(await isAdmin("owner@example.com")).toBe(false);
  });
});
