import { describe, it, expect } from "vitest";
import { isAdmin, ADMIN_EMAIL } from "@/lib/modern/admin";

describe("isAdmin", () => {
  it("defaults to the project owner", () => {
    expect(ADMIN_EMAIL).toBe("admin@example.com");
  });

  it("matches the admin email case-insensitively", () => {
    expect(isAdmin("admin@example.com")).toBe(true);
    expect(isAdmin("BILLYE@Gmail.com")).toBe(true);
  });

  it("rejects other and empty emails", () => {
    expect(isAdmin("someone@else.com")).toBe(false);
    expect(isAdmin("")).toBe(false);
    expect(isAdmin(null)).toBe(false);
    expect(isAdmin(undefined)).toBe(false);
  });
});
